/*!
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/
(function (can) {
  can.Model.Cacheable('CMS.Models.Issue', {
    root_object: 'issue',
    root_collection: 'issues',
    findOne: 'GET /api/issues/{id}',
    findAll: 'GET /api/issues',
    update: 'PUT /api/issues/{id}',
    destroy: 'DELETE /api/issues/{id}',
    create: 'POST /api/issues',
    mixins: [
      'ownable',
      'contactable',
      'ca_update',
      'timeboxed',
      'mapping-limit',
      'inScopeObjects'
    ],
    is_custom_attributable: true,
    attributes: {
      context: 'CMS.Models.Context.stub'
    },
    tree_view_options: {
      attr_list: can.Model.Cacheable.attr_list.concat([
        {attr_title: 'Issue URL', attr_name: 'url'},
        {attr_title: 'Reference URL', attr_name: 'reference_url'}
      ]),
      attr_view: GGRC.mustache_path + '/base_objects/tree-item-attr.mustache'
    },
    info_pane_options: {
      evidence: {
        model: CMS.Models.Document,
        mapping: 'all_documents',
        show_view: GGRC.mustache_path + '/base_templates/attachment.mustache',
        sort_function: GGRC.Utils.sortingHelpers.commentSort
      }
    },
    defaults: {
      status: 'Draft'
    },
    statuses: ['Draft', 'Deprecated', 'Active'],
    init: function () {
      if (this._super) {
        this._super.apply(this, arguments);
      }
      this.validatePresenceOf('audit');
      this.validateNonBlank('title');
    }
  }, {
    form_preload: function (newObjectForm) {
      var pageInstance = GGRC.page_instance();
      if (pageInstance && pageInstance.type === 'Audit' && !this.audit) {
        this.attr('audit', pageInstance);
      }
    },
    object_model: function () {
      return CMS.Models[this.attr('object_type')];
    }
  });
})(window.can, window.GGRC, window.CMS);
