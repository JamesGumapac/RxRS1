/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/currentRecord', 'N/search'],
    /**
     * @param{currentRecord} currentRecord
     * @param{search} search
     */
    (currentRecord, search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (context) => {
        
                var currentRecord = context.newRecord;
                var lineCount = currentRecord.getLineCount({
                    sublistId: 'item'
                });

                log.debug('lineCount', lineCount);

                log.debug('processing', processing);
                for (let i = 0; i <lineCount; i++) {
                    log.debug('line ', i)
                    var item = currentRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    })
                    log.debug('Item Id', item);
                    var quantity = currentRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    })
                    log.debug('Quantity', quantity);
                    var fieldLookUp = search.lookupFields({
                        type: search.Type.ITEM,
                        id: item, //pass the id of the item here
                        columns: 'islotitem'
                    });
                    var islotitem = fieldLookUp.islotitem;

					  if (context.type == context.UserEventType.CREATE){
                        
                              if(islotitem == true){
                        log.debug('Is lot Item', 'True')

                        inventoryDetailSubrecord = currentRecord.getSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail',
                            line: i
                        });
                        log.debug('subrec', inventoryDetailSubrecord);



                        inventoryDetailSubrecord.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'receiptinventorynumber',
                            line: 0,
                            value: 'MULTIPLE'
                        });

                        inventoryDetailSubrecord.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            line: 0,
                            value: quantity
                        });

                    }
                        
                                var processing = currentRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_kod_rqstprocesing',
                        line: i
                    })
                 if(processing){
                    /*   if (processing == 1){
                        currentRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_kod_mfgrtn',
                            line: i,
                            value: true
                        }) } */
                    if (processing == 1){
                        currentRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_kod_mfgrtn',
                            line: i,
                            value: false
                        }) }
                    }
                      }
              
            
                 }
                       
               

                

          
        }


        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return {beforeSubmit}

    });
