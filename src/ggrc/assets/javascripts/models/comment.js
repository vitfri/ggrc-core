/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC, CMS) {
  'use strict';
  /**
   * A model describing a comment to Assessment or Request objects.
   */
  can.Model.Cacheable('CMS.Models.Comment', {
    root_object: 'comment',
    root_collection: 'comments',
    findOne: 'GET /api/comments/{id}',
    findAll: 'GET /api/comments',
    update: 'PUT /api/comments/{id}',
    destroy: 'DELETE /api/comments/{id}',
    create: 'POST /api/comments',
    mixins: [],
    init: function () {
      this.validatePresenceOf('description');
      if (this._super) {
        this._super.apply(this, arguments);
      }
    }
  }, {
    form_preload: function () {
      var pageInstance = GGRC.page_instance();
      this.attr('comment', pageInstance);
    },
    /**
     * Update the description of an instance. Mainly used as an event handler for
     * updating Requests' and Audits' comments.
     *
     * @param {can.Map} instance - the (Comment) instance to update
     * @param {jQuery.Element} $el - the source of the event `ev`
     * @param {jQuery.Event} ev - the onUpdate event object
     */
    updateDescription: function (instance, $el, ev) {
      var $body = $(document.body);

      // for some reason the instance must be refreshed before saving to avoid
      // the HTTP "precondition required" error
      this.refresh()
        .then(function () {
          this.attr('description', ev.newVal);
          return this.save();
        }.bind(this))
        .done(function () {
          $body.trigger('ajax:flash', {
            success: 'Saved.'
          });
        })
        .fail(function () {
          $body.trigger('ajax:flash', {
            error: 'There was a problem with saving.'
          });
          this.attr('description', ev.oldVal);
        }.bind(this));
    },

    /**
     * Return the "name" of the comment as represented to end users.
     *
     * If the "value" of the comment (i.e. its description) does not exist,
     * an empty string is returned.
     *
     * @return {String} - an end user-friendly "name" of the comment
     */
    display_name: function () {
      return this.description || '';
    }
  });
})(window.can, window.GGRC, window.CMS);
