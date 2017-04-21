/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC) {
  'use strict';

  var template = can.view(GGRC.mustache_path +
    '/components/tree/tree-item-actions.mustache');

  var viewModel = can.Map.extend({
    define: {
      deepLimit: {
        type: Number,
        value: 0
      },
      canExpand: {
        type: Boolean,
        value: false
      },
      expandIcon: {
        type: String,
        get: function () {
          return this.attr('expanded') ? 'compress' : 'expand';
        }
      },
      expanderTitle: {
        type: String,
        get: function () {
          return this.attr('expanded') ? 'Collapse tree' : 'Expand tree';
        }
      }
    },
    maximizeObject: function (scope, el, ev) {
      ev.preventDefault();
      ev.stopPropagation();

      this.dispatch({
        type: 'preview',
        element: el
      });
    },
    $el: null,
    openObject: function (scope, el, ev) {
      ev.stopPropagation();
    },
    expand: function (scope, el, ev) {
      this.dispatch('expand');
      ev.stopPropagation();
    },
    subTreeTypes: function () {
      can.trigger(this.attr('$el'), 'childTreeTypes');
    },
    onForceShow: function (event) {
      if (event.state) {
        this.attr('$el').addClass('show-force');
      } else {
        this.attr('$el').removeClass('show-force');
      }
    },
    instance: null,
    childOptions: null,
    addItem: null,
    allowMapping: null,
    isAllowToExpand: null,
    childModelsList: null,
    expanded: false
  });

  GGRC.Components('treeItemActions', {
    tag: 'tree-item-actions',
    template: template,
    viewModel: viewModel,
    events: {
      inserted: function () {
        var parents = this.element.parents('sub-tree-wrapper').length;
        var canExpand = parents < this.viewModel.attr('deepLimit');
        this.viewModel.attr('canExpand', canExpand);
        this.viewModel.attr('$el', this.element);
      }
    }
  });
})(window.can, window.GGRC);
