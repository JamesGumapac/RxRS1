/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record'],
    function (record) {
        var FLD_RET_REQ_IT_PROCESSING = 'custcol_kod_rqstprocesing';
        var FLD_RMA_RET_REQ = 'custbody_kd_return_request';
        var PROCESSING_DESTRUCTION = 1;
        var PROCESSING_RETURN_FOR_CREDIT = 2;

        function beforeLoad(context) {
            if (context.type !== context.UserEventType.CREATE)
                return;
            var customerRecord = context.newRecord;
            customerRecord.setValue('phone', '555-555-5555');
            if (!customerRecord.getValue('salesrep'))
                customerRecord.setValue('salesrep', 46); // replace '46'  with one specific to your account
        }

        function beforeSubmit(context) {
            if (context.type !== context.UserEventType.CREATE)
                return;
            var customerRecord = context.newRecord;
            customerRecord.setValue('comments', 'Please follow up with this customer!');
        }

        function _getSublistValue(objRec, sublistId, fieldId, line) {
            return objRec.getSublistValue({
                sublistId: sublistId,
                fieldId: fieldId,
                line: line
            });
        }

        function _setCurrentSublistValue(objRec, sublistId, fieldId, value, ignoreFieldChange) {
            return objRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: fieldId,
                value: value,
                ignoreFieldChange: ignoreFieldChange
            });
        }

        function createRma(returnRequestRec) {
            var rmaRec = record.create({
                type: record.Type.RETURN_AUTHORIZATION,
                isDynamic: true
            });

            rmaRec.setValue('entity', returnRequestRec.getValue('entity'));
            rmaRec.setValue('orderstatus', 'B');
            rmaRec.setValue(FLD_RMA_RET_REQ, returnRequestRec.id);
            rmaRec.setValue('location', returnRequestRec.getValue('location'))

            var item, qty, rate, amount, processing, priceLevel;
            var subRecNum, subRecQty, subRecExpDate;
            for (var i = 0; i < returnRequestRec.getLineCount('item'); i++) {
                item = _getSublistValue(returnRequestRec, 'item', 'item', i);
                qty = _getSublistValue(returnRequestRec, 'item', 'quantity', i);
                rate = _getSublistValue(returnRequestRec, 'item', 'rate', i);
                amount = _getSublistValue(returnRequestRec, 'item', 'amount', i);
                log.debug('createRma', 'item: ' + item + '; qty: ' + qty + ';rate: ' + rate + '; amount:' + amount);

                rmaRec.selectNewLine({
                    sublistId: 'item'
                });

                _setCurrentSublistValue(rmaRec, 'item', 'item', item, true);
                _setCurrentSublistValue(rmaRec, 'item', 'quantity', qty, true);

                processing = _getSublistValue(returnRequestRec, 'item', FLD_RET_REQ_IT_PROCESSING, i);
                if (processing == PROCESSING_DESTRUCTION) {
                    //set price level to -1
                    _setCurrentSublistValue(rmaRec, 'item', 'price', '-1', true);
                    _setCurrentSublistValue(rmaRec, 'item', 'rate', rate, true);
                    _setCurrentSublistValue(rmaRec, 'item', 'amount', amount, true);
                } else {
                    _setCurrentSublistValue(rmaRec, 'item', 'amount', amount, true);
                }

                /*var returnReqSubrec = returnRequestRec.getSublistSubrecord({
                    sublistId: 'item',
                    fieldId: 'inventorydetail',
                    line: i
                });
                log.debug('test', 'subrecord line count: ' + returnReqSubrec.getLineCount('inventoryassignment'));
                var subrecordCount = returnReqSubrec.getLineCount('inventoryassignment');
                var subRec = rmaRec.getCurrentSublistSubrecord({
                    sublistId: 'item',
                    fieldId: 'inventorydetail'
                });
                for(var subrecIndx = 0; subrecIndx < subrecordCount; subrecIndx++){
                    log.debug('test', 'subrecord invnum: ' + returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        line: subrecIndx}));
                    log.debug('test', 'subrecord quantity: ' + returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        line: subrecIndx}));
                    log.debug('test', 'subrecord expirationdate: ' + returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'expirationdate',
                        line: subrecIndx}));

                    subRecNum = returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        line: subrecIndx
                    });

                    subRecQty = returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        line: subrecIndx
                    });

                    subRecExpDate = returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'expirationdate',
                        line: subrecIndx
                    });

                    subRec.selectNewLine({
                        sublistId: 'inventoryassignment',
                    });

                    subRec.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        value: subRecQty
                    });

                    subRec.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        value: subRecNum
                    });

                    subRec.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'expirationdate',
                        value: subRecExpDate
                    });

                    subRec.commitLine({
                        sublistId: 'inventoryassignment'
                    });
                }*/

                rmaRec.commitLine('item');
            }

            var rmaId = rmaRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug('createRma', 'RMA ID: ' + rmaId)

            updateRmaInvDetail(rmaId, returnRequestRec);

            return rmaId;
        }

        function updateRmaInvDetail(rmaId, returnRequestRec) {
            var rmaRec = record.load({
                type: record.Type.RETURN_AUTHORIZATION,
                id: rmaId,
                isDynamic: true,
            });

            var isNumbered;
            for (var i = 0; i < rmaRec.getLineCount('item'); i++) {
                rmaRec.selectLine({
                    sublistId: 'item',
                    line: i
                });

                rmaRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: true
                });

                var returnReqSubrec = returnRequestRec.getSublistSubrecord({
                    sublistId: 'item',
                    fieldId: 'inventorydetail',
                    line: i
                });
                isNumbered = rmaRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'isnumbered'
                });
                log.debug('updateRmaInvDetail', 'line ' + i + ' isnumbered ' + isNumbered);
                if (isNumbered == 'T') {
                    log.debug('test', 'subrecord line count: ' + returnReqSubrec.getLineCount('inventoryassignment'));
                    var subrecordCount = returnReqSubrec.getLineCount('inventoryassignment');
                    var subRec = rmaRec.getCurrentSublistSubrecord({
                        sublistId: 'item',
                        fieldId: 'inventorydetail'
                    });
                    for (var subrecIndx = 0; subrecIndx < subrecordCount; subrecIndx++) {
                        log.debug('test', 'subrecord invnum: ' + returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            line: subrecIndx
                        }));
                        log.debug('test', 'subrecord quantity: ' + returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            line: subrecIndx
                        }));
                        log.debug('test', 'subrecord expirationdate: ' + returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'expirationdate',
                            line: subrecIndx
                        }));

                        subRecNum = returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            line: subrecIndx
                        });

                        subRecQty = returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            line: subrecIndx
                        });

                        subRecExpDate = returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'expirationdate',
                            line: subrecIndx
                        });

                        subRec.selectNewLine({
                            sublistId: 'inventoryassignment',
                        });

                        subRec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: subRecQty
                        });

                        subRec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            value: subRecNum
                        });

                        subRec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'expirationdate',
                            value: subRecExpDate
                        });

                        subRec.commitLine({
                            sublistId: 'inventoryassignment'
                        });
                    }

                    rmaRec.commitLine({
                        sublistId: 'item'
                    })
                }

            }

            var rmaId = rmaRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug('update RMA INV DTL', 'RMA ID: ' + rmaId)

        }

        function receiveRma(rmaId, returnRequestRec) {
            var irRec = record.transform({
                fromType: record.Type.RETURN_AUTHORIZATION,
                fromId: rmaId,
                toType: record.Type.ITEM_RECEIPT,
                isDynamic: true,
            });

            for (var i = 0; i < irRec.getLineCount('item'); i++) {
                irRec.selectLine({
                    sublistId: 'item',
                    line: i
                });

                irRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: true
                });

                /*var subRec = irRec.getCurrentSublistSubrecord({
                    sublistId: 'item',
                    fieldId: 'inventorydetail'
                });

                subRec.selectNewLine({
                    sublistId: 'inventoryassignment',
                })

                subRec.setCurrentSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'quantity',
                    value: irRec.getCurrentSublistValue('item', 'quantity')
                })

                subRec.setCurrentSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'receiptinventorynumber',
                    value: 'MULTIPLE'
                })

                subRec.commitLine({
                    sublistId: 'inventoryassignment'
                })*/
                /*var returnReqSubrec = returnRequestRec.getSublistSubrecord({
                    sublistId: 'item',
                    fieldId: 'inventorydetail',
                    line: i
                });
                log.debug('test', 'subrecord line count: ' + returnReqSubrec.getLineCount('inventoryassignment'));
                var subrecordCount = returnReqSubrec.getLineCount('inventoryassignment');
                var subRec = irRec.getCurrentSublistSubrecord({
                    sublistId: 'item',
                    fieldId: 'inventorydetail'
                });
                for(var subrecIndx = 0; subrecIndx < subrecordCount; subrecIndx++){
                    subRecNum = returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        line: subrecIndx
                    });

                    subRecQty = returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        line: subrecIndx
                    });

                    subRecExpDate = returnReqSubrec.getSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'expirationdate',
                        line: subrecIndx
                    });

                    log.debug('receiveRMA', 'invnum: ' + subRecNum + '; qty: ' + subRecQty + '; expdate: ' + subRecExpDate + '; LINE QTY: ' + irRec.getCurrentSublistValue({sublistId: 'item', fieldId: 'quantity'}));

                    subRec.selectNewLine({
                        sublistId: 'inventoryassignment',
                    });

                    subRec.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'quantity',
                        value: subRecQty
                    });

                    subRec.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'receiptinventorynumber',
                        value: subRecNum
                    });

                    subRec.setCurrentSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: 'expirationdate',
                        value: subRecExpDate
                    });

                    subRec.commitLine({
                        sublistId: 'inventoryassignment'
                    });
                }*/

                irRec.commitLine({
                    sublistId: 'item'
                })
            }

            irRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug('receiveRma', 'Item Receipt ID: ' + irRec.id);
        }

        function createCreditMemo(rmaId) {
            var cmRec = record.transform({
                fromType: record.Type.RETURN_AUTHORIZATION,
                fromId: rmaId,
                toType: record.Type.CREDIT_MEMO,
                isDynamic: true,
            });
            cmRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug('createCreditMemo', 'Credit Memo ID: ' + cmRec.id);
        }

        function createPharmacyInvoice(returnRequestRec) {
            var invcRec = record.create({
                type: record.Type.INVOICE,
                isDynamic: true
            });

            invcRec.setValue('entity', returnRequestRec.getValue('entity'));
            //invcRec.setValue('orderstatus', 'B');
            invcRec.setValue(FLD_RMA_RET_REQ, returnRequestRec.id);
            invcRec.setValue('location', returnRequestRec.getValue('location'));
            log.debug('createPharmacyInvoice', 'invcRec Location: ' + invcRec.getValue('location'));

            var item, qty, rate, amount, processing, priceLevel;
            for (var i = 0; i < returnRequestRec.getLineCount('item'); i++) {
                //processing = _getSublistValue(returnRequestRec, 'item', FLD_RET_REQ_IT_PROCESSING, i);
                if (_getSublistValue(returnRequestRec, 'item', FLD_RET_REQ_IT_PROCESSING, i) == PROCESSING_DESTRUCTION) {
                    item = _getSublistValue(returnRequestRec, 'item', 'item', i);
                    qty = _getSublistValue(returnRequestRec, 'item', 'quantity', i);
                    rate = _getSublistValue(returnRequestRec, 'item', 'rate', i);
                    amount = _getSublistValue(returnRequestRec, 'item', 'amount', i);
                    log.debug('createRma', 'item: ' + item + '; qty: ' + qty + ';rate: ' + rate + '; amount:' + amount);

                    invcRec.selectNewLine({
                        sublistId: 'item'
                    });

                    _setCurrentSublistValue(invcRec, 'item', 'item', item, true);
                    _setCurrentSublistValue(invcRec, 'item', 'quantity', qty, true);
                    _setCurrentSublistValue(invcRec, 'item', 'price', '-1', true);
                    _setCurrentSublistValue(invcRec, 'item', 'rate', rate, true);
                    _setCurrentSublistValue(invcRec, 'item', 'amount', amount, true);
                    _setCurrentSublistValue(invcRec, 'item', 'location', invcRec.getValue('location'), true);

                    log.debug('createPharmacyInvoice', 'item qty: ' + invcRec.getCurrentSublistValue('item', 'quantity'));
                    //here
                    var returnReqSubrec = returnRequestRec.getSublistSubrecord({
                        sublistId: 'item',
                        fieldId: 'inventorydetail',
                        line: i
                    });
                    log.debug('test', 'subrecord line count: ' + returnReqSubrec.getLineCount('inventoryassignment'));
                    var subrecordCount = returnReqSubrec.getLineCount('inventoryassignment');
                    var invSubRec = invcRec.getCurrentSublistSubrecord({
                        sublistId: 'item',
                        fieldId: 'inventorydetail'
                    });
                    /*for(var subrecIndx = 0; subrecIndx < subrecordCount; subrecIndx++){
                        log.debug('test', 'subrecord invnum: ' + returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'numberedrecordid',
                            line: subrecIndx}));
                        log.debug('test', 'subrecord quantity: ' + returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            line: subrecIndx}));
                        log.debug('test', 'subrecord expirationdate: ' + returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'expirationdate',
                            line: subrecIndx}));

                        subRecNum = returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'numberedrecordid',
                            line: subrecIndx
                        });

                        subRecQty = returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            line: subrecIndx
                        });

                        subRecExpDate = returnReqSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'expirationdate',
                            line: subrecIndx
                        });

                        invSubRec.selectNewLine({
                            sublistId: 'inventoryassignment',
                        });

                        invSubRec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: subRecQty
                        });

                        invSubRec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
                            value: subRecNum
                        });

                        invSubRec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'expirationdate',
                            value: subRecExpDate
                        });

                        invSubRec.commitLine({
                            sublistId: 'inventoryassignment'
                        });
                    }*/

                    invcRec.commitLine('item');
                }
            }

            var invcId = invcRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug('createRma', 'INVOICE ID: ' + rmaId)

            return invcId;
        }

        function afterSubmit(context) {
            if (context.type == context.UserEventType.CREATE)
                return;
            var returnRequestOldRec = context.oldRecord;
            var returnRequestRec = context.newRecord;
            //log.debug('createRma', 'new status: ' + returnRequestRec.getValue('transtatus'))
            //log.debug('createRma', 'old status: ' + returnRequestOldRec.getValue('transtatus'))
            //log.debug('createRma', 'status: ' + returnRequestRec.getText('transtatus').toUpperCase())
            if (returnRequestRec.getValue('transtatus') != returnRequestOldRec.getValue('transtatus') && returnRequestRec.getText('transtatus').toUpperCase() == 'APPROVED') {
                //create pharmacy invoice
                //create manufacturing sales order
                //create wholesale sales order
                var rmaId = createRma(returnRequestRec);
                receiveRma(rmaId, returnRequestRec);
                createCreditMemo(rmaId);
                //createPharmacyInvoice(returnRequestRec);
            }
        }

        return {
            afterSubmit: afterSubmit
        };
    });