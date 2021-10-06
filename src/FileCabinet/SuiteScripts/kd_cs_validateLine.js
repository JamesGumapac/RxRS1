/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search'],

    function (search) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            alert('hello')
            log.debug('pageInit')
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */

        function validateLine(context) {
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            ITEM_MANUFACTURER = 'custcol_kd_item_manufacturer';
            MFG_RTN = 'custcol_kod_mfgrtn'

            var item_manuf = currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: ITEM_MANUFACTURER
            });
            var mfg_rtn = currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: MFG_RTN
            })
            log.debug('item Manuf', item_manuf)
            if (sublistName == 'item') {
                if (item_manuf) {
                    if (mfg_rtn == false) {
                        alert('You cannot unset MFG RTN field if the item has a manufacturer')
                        currentRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: MFG_RTN,
                            value: true
                        });
                        return false;
                    } else {
                        return true;
                    }

                }

            }


            return true;
        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */


        return {

            validateLine: validateLine
        };

    });
