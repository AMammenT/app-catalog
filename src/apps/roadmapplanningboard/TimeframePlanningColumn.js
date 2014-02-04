(function () {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('Rally.apps.roadmapplanningboard.TimeframePlanningColumn', {
        extend: 'Rally.apps.roadmapplanningboard.PlanningBoardColumn',
        alias: 'widget.timeframeplanningcolumn',

        requires: [
            'Rally.data.wsapi.Filter',
            'Rally.apps.roadmapplanningboard.ThemeHeader',
            'Rally.apps.roadmapplanningboard.PlanCapacityProgressBar',
            'Rally.apps.roadmapplanningboard.util.Fraction',
            'Rally.apps.roadmapplanningboard.PlanningCapacityPopoverView',
            'Rally.apps.roadmapplanningboard.util.TimelineViewModel'
        ],

        config: {
            startDateField: 'startDate',
            endDateField: 'endDate',
            editPermissions: {
                capacityRanges: true,
                theme: true,
                timeframeDates: true
            },
            timeframePlanStoreWrapper: undefined,
            timeframeRecord: undefined,
            planRecord: undefined,
            dateFormat: 'M j',
            pointField: 'PreliminaryEstimate'
        },

        constructor: function (config) {
            this.mergeConfig(config);
            this.config.storeConfig.sorters = [
                {
                    sorterFn: Ext.bind(this._sortPlan, this)
                }
            ];
            this.callParent([this.config]);
        },

        initComponent: function () {
            this.callParent(arguments);

            this.on('ready', this.drawHeader, this);
            this.on('addcard', this.drawHeader, this);
            this.on('cardupdated', this.drawHeader, this);
            this.on('removecard', this.drawHeader, this);
            this.on('afterrender', this.onAfterRender, this);

            if (this.planRecord && this.planRecord.store) {
                this.planRecord.store.on('update', function () {
                    this.drawHeader();
                }, this);
            }
            this._createDummyPlannedCapacityRangeTooltipForSizeCalculations();
        },

        _createDummyPlannedCapacityRangeTooltipForSizeCalculations: function () {
            this.dummyPlannedCapacityRangeTooltip = Ext.create('Rally.ui.tooltip.ToolTip', {
                target: Ext.getBody(),
                html: this._getPlannedCapacityRangeTooltipTitle(),
                listeners: {
                    beforeshow: function () {
                        this.hide();
                    }
                }
            });
            this.dummyPlannedCapacityRangeTooltip.show();
        },

        getColumnIdentifier: function () {
            return "planningboardtimeframecolumn" + this.planRecord.getId();
        },

        /**
         * @private
         * Custom sort function for the plan column. It uses the order of features within the plan record to determine
         * the order of feature cards. WSAPI gives us the features in a different order than we want, so we must
         * reorder
         * @param a {Rally.data.Model} The first record to compare
         * @param b {Rally.data.Model} The second record to compare
         * @returns {Number}
         */
        _sortPlan: function (a, b) {
            var aIndex = this._findFeatureIndex(a);
            var bIndex = this._findFeatureIndex(b);

            return aIndex > bIndex ? 1 : -1;
        },

        /**
         * @private
         * Return the index of the feature in the plan record. This is used to sort records returned from WSAPI
         * @param {Rally.data.Model} record
         * @returns {Number} This will return the index of the record in the plan features array
         */
        _findFeatureIndex: function (record) {
            return _.findIndex(this.planRecord.get('features'), function (feature) {
                return feature.id === record.get('_refObjectUUID').toString();
            });
        },

        /**
         * Override
         * @returns {boolean}
         */
        mayRank: function () {
            return this._getSortDirection() === 'ASC' && this.enableRanking;
        },

        onAfterRender: function (event) {
            if (this.editPermissions.capacityRanges) {
                this.columnHeader.getEl().on('click', this.onProgressBarClick, this, {
                    delegate: '.progress-bar-container'
                });
            }
            if (this.editPermissions.timeframeDates) {
                this.columnHeader.getEl().on('click', this.onTimeframeDatesClick, this, {
                    delegate: '.timeframeDates'
                });
            }
        },

        getStoreFilter: function (model) {
            var result = _.reduce(this.planRecord.data.features, function (result, feature) {
                var filter = this._createFeatureFilter(feature.id);
                if (!result) {
                    return filter;
                } else {
                    return result.or(filter);
                }
            }, null, this);
            return result || this._createFeatureFilter(null);
        },

        _createFeatureFilter: function (featureId) {
            return Ext.create('Rally.data.wsapi.Filter', {
                property: 'ObjectID',
                operator: '=',
                value: featureId
            });
        },

        onProgressBarClick: function (event) {
            var target = Ext.get(Ext.query('.progress-bar-background', this.getColumnHeader().getEl().dom)[0]);

            this.plannedCapacityRangeTooltip.disable();

            if (this.popover) {
                return;
            }
            this.popover = Ext.create('Rally.apps.roadmapplanningboard.PlanningCapacityPopoverView', {
                target: target,
                owner: this,
                offsetFromTarget: [
                    {
                        x: 0,
                        y: 0
                    },
                    {
                        x: 0,
                        y: 0
                    },
                    {
                        x: 0,
                        y: 5
                    },
                    {
                        x: 0,
                        y: 0
                    }
                ],
                controllerConfig: {
                    model: this.planRecord
                },
                listeners: {
                    beforedestroy: function () {
                        this.popover = null;
                        if (this._getHighCapacity()) {
                            this.plannedCapacityRangeTooltip.enable();
                        }
                    },
                    scope: this
                }
            });
        },

        onTimeframeDatesClick: function (event) {
            var _this = this;

            this.timeframePopover = Ext.create('Rally.apps.roadmapplanningboard.TimeframeDatesPopoverView', {
                target: Ext.get(event.target),
                offsetFromTarget: [
                    {
                        x: 0,
                        y: 0
                    },
                    {
                        x: 0,
                        y: 0
                    },
                    {
                        x: 0,
                        y: 5
                    },
                    {
                        x: 0,
                        y: 0
                    }
                ],
                timelineViewModel: Rally.apps.roadmapplanningboard.util.TimelineViewModel.createFromStores(this.timeframePlanStoreWrapper, this.timeframeRecord),
                listeners: {
                    destroy: function () {
                        _this._drawDateRange();
                        _this.timeframePopover = null;
                    },
                    save: function (options) {
                        _this._saveTimeframeDates(options);
                    }
                }
            });
        },

        _drawDateRange: function () {
            if (this.dateRange) {
                this.dateRange.update(this.getDateHeaderTplData());
            } else {
                this.dateRange = this.getHeaderTitle().add({
                    xtype: 'component',
                    cls: 'timeframeDatesContainer',
                    tpl: "<div class='timeframeDates {clickableClass}'>{formattedDate}</div>",
                    data: this.getDateHeaderTplData(),
                    listeners: {
                        afterrender: this._createDateRangeTooltip,
                        scope: this
                    }
                });
            }
        },

        _createDateRangeTooltip: function () {
            if (this.dateRangeTooltip) {
                this.dateRangeTooltip.destroy();
            }

            this.dateRangeTooltip = Ext.create('Rally.ui.tooltip.ToolTip', {
                target: this.dateRange.getEl(),
                hideDelay: 100,
                anchor: 'left',
                html: this.getDateHeaderTplData().titleText
            });
        },

        _drawProgressBar: function () {
            if (this.progressBar) {
                this.progressBar.update(this.getHeaderTplData());
                this._afterProgressBarRender();
            } else {
                this.progressBar = this.getColumnHeader().add({
                    xtype: 'container',
                    tpl: [
                        '<div class="progress-bar-background">',
                            '<tpl if="highCapacity">',
                                '<div class="progress-bar-percent-done">{formattedPercent}</div>',
                                '<div class="progress-bar-display">{progressBarHtml}</div>',
                            '<tpl else>',
                                '<div>',
                                    '<span>{pointTotal}</span> <span class="no-capacity-label">{itemType} {pointText}</span>',
                                    '<div class="add-capacity"></div>',
                                '</div>',
                            '</tpl>',
                        '</div>'
                    ],
                    data: this.getHeaderTplData(),
                    listeners: {
                        afterrender: this._afterProgressBarRender,
                        scope: this
                    }
                });
            }
        },

        _afterProgressBarRender: function () {
            this._addCapacityButton();
            this._createPlannedCapacityRangeTooltip();
            if (this._getHighCapacity()) {
                this.plannedCapacityRangeTooltip.enable();
            } else {
                this.plannedCapacityRangeTooltip.disable();
            }
        },

        _addCapacityButton: function () {
            if (this.editPermissions.capacityRanges && this.rendered) {
                Ext.create('Rally.ui.Button', {
                    text: 'Set Capacity',
                    cls: 'secondary dark',
                    renderTo: Ext.query('.add-capacity', this.getColumnHeader().getEl().dom)[0],
                    handler: this.onProgressBarClick,
                    scope: this
                });
            }
        },

        _createPlannedCapacityRangeTooltip: function () {
            if (this.plannedCapacityRangeTooltip) {
                return;
            }

            var anchorOffset = 0;
            var mouseXOffset = 0;

            if (this.dummyPlannedCapacityRangeTooltip) {
                var tooltipWidth = this.dummyPlannedCapacityRangeTooltip.getWidth();
                var anchorWidth = this.dummyPlannedCapacityRangeTooltip.getEl().down('.' + Ext.baseCSSPrefix + 'tip-anchor').getWidth();
                anchorOffset = tooltipWidth / 2 - anchorWidth;
                var width = this.rendered ? this.getWidth() : 0;
                mouseXOffset = (width - tooltipWidth) / 2;
                this.dummyPlannedCapacityRangeTooltip.destroy();
            }

            this.plannedCapacityRangeTooltip = Ext.create('Rally.ui.tooltip.ToolTip', {
                cls: 'planned-capacity-range-tooltip',
                target: this.progressBar.getEl(),
                anchor: 'top',
                anchorOffset: anchorOffset,
                mouseOffset: [ mouseXOffset, 0],
                hideDelay: 100,
                html: this._getPlannedCapacityRangeTooltipTitle()
            });
        },

        _drawTheme: function () {
            if (!this.theme && this.planRecord) {
                this.theme = this.getColumnHeader().add({
                    xtype: 'roadmapthemeheader',
                    record: this.planRecord,
                    editable: this.editPermissions.theme,
                    style: {
                        display: this.ownerCardboard.showTheme ? '' : 'none' // DE18305 - using style.display instead of hidden because Ext won't render children that are hidden
                    }
                });
            }
        },

        getHeaderTplData: function () {
            var pointField = this.pointField;
            var highCapacity = this._getHighCapacity();
            var lowCapacity = (this.planRecord && this.planRecord.get('lowCapacity')) || 0;

            var fraction = Ext.create('Rally.apps.roadmapplanningboard.util.Fraction', {
                denominator: highCapacity,
                numeratorItems: this.getCards(true),
                numeratorItemValueFunction: function (card) {
                    if (card.getRecord().get(pointField)) {
                        return card.getRecord().get(pointField).Value || 0;
                    }
                    return 0;
                }
            });

            var pointTotal = fraction.getNumerator();

            return {
                highCapacity: highCapacity,
                lowCapacity: lowCapacity,
                pointTotal: pointTotal,
                pointText: 'pt' + (pointTotal !== 1 ? 's' : ''),
                itemType: this.typeNames.child.name.toLowerCase(),
                progressBarHtml: this._getProgressBarHtml(fraction),
                formattedPercent: fraction.getFormattedPercent(),
                progressBarTitle: this._getPlannedCapacityRangeTooltipTitle()
            };
        },

        _getHighCapacity: function () {
            return (this.planRecord && this.planRecord.get('highCapacity')) || 0;
        },

        getDateHeaderTplData: function () {
            var title = 'Date Range';

            return {
                formattedDate: this._getDateRange(),
                titleText: this.editPermissions.timeframeDates ? 'Edit ' + title : title,
                clickableClass: this.editPermissions.timeframeDates ? 'clickable' : ''
            };
        },

        drawHeader: function () {
            this.callParent(arguments);
            this._drawDateRange();
            this._drawProgressBar();
            this._drawTheme();
        },

        _getDateRange: function () {
            var formattedEndDate, formattedStartDate;

            formattedStartDate = this._getFormattedDate(this.startDateField);
            formattedEndDate = this._getFormattedDate(this.endDateField);
            if (!formattedStartDate && !formattedEndDate) {
                return "&nbsp;";
            }
            return "" + formattedStartDate + " - " + formattedEndDate;
        },

        _getFormattedDate: function (dateField) {
            var date;

            date = this.timeframeRecord.get(dateField);
            if (date) {
                return Ext.Date.format(date, this.dateFormat);
            }
        },

        _getProgressBarHtml: function (fraction) {
            var progressBar = Ext.create('Rally.apps.roadmapplanningboard.PlanCapacityProgressBar', {
                isClickable: this.editPermissions.capacityRanges
            });

            var lowCapacity = this.planRecord ? this.planRecord.get('lowCapacity') : undefined;
            var highCapacity = this.planRecord ? this.planRecord.get('highCapacity') : undefined;

            return progressBar.apply({
                low: lowCapacity || 0,
                high: highCapacity || 0,
                total: fraction.getNumerator(),
                percentDone: fraction.getPercent()
            });
        },

        _getPlannedCapacityRangeTooltipTitle: function () {
            var title = 'Planned Capacity Range';
            return this.editPermissions.capacityRanges ? 'Edit ' + title : title;
        },

        _saveTimeframeDates: function (options) {
            this.timeframeRecord.set('startDate', options.startDate);
            this.timeframeRecord.set('endDate', options.endDate);

            // Remove these 2 lines once we switch over to use Oracle and the new startDate/endDate
            this.timeframeRecord.set('start', options.startDate);
            this.timeframeRecord.set('end', options.endDate);

            if (this.timeframeRecord.dirty) {
                this.timeframeRecord.save({
                    requester: this.view
                });
            }

            return true;
        }
    });

})();
