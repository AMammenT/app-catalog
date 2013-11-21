(function () {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('Rally.apps.roadmapplanningboard.PlanningBoardColumn', {
        extend: 'Rally.ui.cardboard.Column',
        alias: 'widget.planningboardcolumn',
        
        mixins: {
            maskable: 'Rally.ui.mask.Maskable'
        },
        
        requires: [
            'Rally.apps.roadmapplanningboard.plugin.OrcaColumnDropController',
            'Rally.ui.cardboard.ColumnDropTarget'
        ],
        
        config: {
            storeConfig: {
                fetch: ['Value', 'FormattedID', 'Owner','Name', 'PreliminaryEstimate', 'DisplayColor']
            },
            dropControllerConfig: {
                ptype: 'orcacolumndropcontroller'
            },
            cardConfig: {
                showIconsAndHighlightBorder: true,
                showPlusIcon: false,
                showColorIcon: true,
                showGearIcon: true,
                showReadyIcon: false,
                showBlockedIcon: false,
                showEditMenuItem: true,
                showCopyMenuItem: false,
                showSplitMenuItem: false,
                showDeleteMenuItem: true
            }
        },

        initComponent: function () {
            this.callParent(arguments);
            return this.on('beforerender', function () {
                var cls;

                cls = 'planning-column';
                this.getContentCell().addCls(cls);
                return this.getColumnHeaderCell().addCls(cls);
            }, this, {
                single: true
            });
        },

        isMatchingRecord: function () {
            return true;
        },

        _getProgressBarHtml: function () {
            return '<div></div>';
        },

        findCardInfo: function (searchCriteria, includeHiddenCards) {
            var card, index, _i, _len, _ref;

            searchCriteria = searchCriteria.get && searchCriteria.getId() ? searchCriteria.getId() : searchCriteria;
            _ref = this.getCards(includeHiddenCards);
            for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
                card = _ref[index];
                if (card.getRecord().getId() === searchCriteria || card.getEl() === searchCriteria || card.getEl() === Ext.get(searchCriteria)) {
                    return {
                        record: card.getRecord(),
                        index: index,
                        card: card
                    };
                }
            }
            return null;
        },

        destroy: function () {
            var plugin, _i, _len, _ref;

            _ref = this.plugins;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                plugin = _ref[_i];
                if (plugin !== null) {
                    plugin.destroy();
                }
            }
            return this.callParent(arguments);
        }
    });

})();
