/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC, CMS) {
  'use strict';

  var defaultOrderBy = 'created_at';

  can.Component.extend({
    tag: 'related-objects',
    viewModel: {
      define: {
        noRelatedObjectsMessage: {
          type: 'string',
          get: function () {
            return 'No Related ' + this.attr('relatedItemsType') + 's ' +
              'were found';
          }
        },
        isLoading: {
          type: 'boolean',
          value: false
        },
        paging: {
          value: function () {
            return new GGRC.VM.Pagination({pageSizeSelect: [5, 10, 15]});
          }
        }
      },
      baseInstance: null,
      relatedObjects: [],
      relatedItemsType: '@',
      orderBy: '@',
      selectedItem: {},
      objectSelectorEl: '.grid-data__action-column button',
      getParams: function () {
        var id;
        var type;
        var relatedType = this.attr('relatedItemsType');
        var orderBy = this.attr('orderBy') || defaultOrderBy;
        var isAssessment = this.attr('baseInstance.type') === 'Assessment';
        var isSnapshot = !!this.attr('baseInstance.snapshot');
        var op = isAssessment ? {name: 'similar'} : {name: 'relevant'};
        var params = {};

        if (isSnapshot) {
          id = this.attr('baseInstance.snapshot.child_id');
          type = this.attr('baseInstance.snapshot.child_type');
        } else {
          id = this.attr('baseInstance.id');
          type = this.attr('baseInstance.type');
        }

        params.data = [{
          limit: this.attr('paging.limits'),
          object_name: relatedType,
          order_by: orderBy.split(',').map(function (field) {
            return {name: field, desc: true};
          }),
          filters: {
            expression: {
              object_name: type,
              op: op,
              ids: [id]
            }
          }
        }];
        return params;
      },
      loadRelatedItems: function () {
        var dfd = can.Deferred();
        var params = this.getParams();
        this.attr('isLoading', true);
        GGRC.Utils.QueryAPI
          .makeRequest(params)
          .done(function (responseArr) {
            var relatedType = this.attr('relatedItemsType');
            var data = responseArr[0];
            var values = data[relatedType].values;
            var result = values.map(function (item) {
              return {
                instance: CMS.Models[relatedType].model(item)
              };
            });
            // Update paging object
            this.attr('paging.total', data[relatedType].total);
            dfd.resolve(result);
          }.bind(this))
          .fail(function () {
            dfd.resolve([]);
          })
          .always(function () {
            this.attr('isLoading', false);
          }.bind(this));
        return dfd;
      },
      setRelatedItems: function () {
        this.attr('relatedObjects').replace(this.loadRelatedItems());
      }
    },
    init: function () {
      this.viewModel.setRelatedItems();
    },
    events: {
      '{viewModel.paging} current': function () {
        this.viewModel.setRelatedItems();
      },
      '{viewModel.paging} pageSize': function () {
        this.viewModel.setRelatedItems();
      },
      '{viewModel.baseInstance} related_destinations': function () {
        if (!this.viewModel.attr('isLoading')) {
          this.viewModel.setRelatedItems();
        }
      },
      '{viewModel.baseInstance} related_sources': function () {
        if (!this.viewModel.attr('isLoading')) {
          this.viewModel.setRelatedItems();
        }
      }
    }
  });
})(window.can, window.GGRC, window.CMS);
