/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (GGRC) {
  'use strict';
  /**
   * Utils for state.
   */
  GGRC.Utils.State = (function () {
    var statesModels = [
      {
        models: [
          'AccessGroup', 'Clause', 'Contract',
          'Control', 'DataAsset', 'Facility', 'Issue', 'Market',
          'Objective', 'OrgGroup', 'Policy', 'Process', 'Product', 'Program',
          'Project', 'Regulation', 'Risk', 'Section', 'Standard', 'System',
          'Threat', 'Vendor', 'Issue'
        ],
        states: ['Active', 'Draft', 'Deprecated']
      },
      {
        models: ['Assessment'],
        states: [
          'Not Started', 'In Progress', 'Ready for Review',
          'Completed and Verified', 'Completed (no verification)'
        ]
      },
      {
        models: ['Audit'],
        states: [
          'Planned', 'In Progress', 'Manager Review',
          'Ready for External Review', 'Completed'
        ]
      },
      {
        models: [
          'Person', 'CycleTaskGroupObjectTask',
          'AssessmentTemplate', 'Workflow',
          'TaskGroup', 'Cycle'
        ],
        states: []
      }
    ];

    /**
     * Check if model has state.
     * @param {String} model - The model name
     * @return {Boolean} True or False
     */
    function hasState(model) {
      var pair = getStatesModelsPair(model);

      if (!pair) {
        return false;
      }

      return pair.states.length > 0;
    }

    /**
     * Check if model should have filter by state.
     * @param {String} model - The model name
     * @return {Boolean} True or False
     */
    function hasFilter(model) {
      return hasState(model);
    }

    /**
     * Get States-Models pair.
     * @param {String} model - The model name
     * @return {Object} object with 'models' and 'states' properties
     */
    function getStatesModelsPair(model) {
      var pairs = statesModels.filter(function (item) {
        return item.models.indexOf(model) > -1;
      });

      return pairs.length > 0 ? pairs[0] : null;
    }

     /**
     * Get states for model.
     * @param {String} model - The model name
     * @return {Array} array of strings
     */
    function getStatesForModel(model) {
      var pair = getStatesModelsPair(model);
      return pair ? pair.states : [];
    }

    /**
     * Transform query for objects into query which filter them by state.
     * @param {Array} statuses - array of active statuses
     * @param {String} filterString - original query string
     * @param {String} modelName - model name
     * @return {String} The transformed query
     */
    function statusFilter(statuses, filterString, modelName) {
      var filter = modelName === 'Assessment' ?
        buildAssessmentFilter(statuses) :
        buildStatusesFilterString(statuses);

      filterString = filterString || '';
      if (filter !== '') {
        if (filterString !== '') {
          return filterString + ' And ' + filter;
        }
        return filter;
      }

      return filterString;
    }

    /**
     * Build statuses filter string
     * @param {Array} statuses - array of active statuses
     * @return {String} statuses filter
     */
    function buildStatusesFilterString(statuses) {
      return statuses.map(function (item) {
        // wrap in quotes
        return '"Status"="' + item + '"';
      }).join(' Or ');
    }

    /**
     * Build statuses filter for Assessment model
     * @param {Array} statuses - array of active statuses
     * @return {String} statuses filter
     */
    function buildAssessmentFilter(statuses) {
      var verifiedIndex = statuses.indexOf('Completed and Verified');
      var completedIndex = statuses.indexOf('Completed (no verification)');
      var isVerified = false;
      var filter;

      // copy array. Do not change original
      statuses = statuses.slice();

      // do not update statuses
      if (verifiedIndex === -1 && completedIndex === -1) {
        return buildStatusesFilterString(statuses);
      }

      if (verifiedIndex > -1 && completedIndex > -1) {
        // server doesn't know about "Completed (no verification)"
        // we replace it with "Completed"
        statuses.splice(completedIndex, 1, 'Completed');

        // database doesn't have "Verified" status
        // remove it
        statuses.splice(verifiedIndex, 1);

        return buildStatusesFilterString(statuses);
      }

      if (completedIndex > -1 && verifiedIndex === -1) {
        statuses.splice(completedIndex, 1, 'Completed');
      } else if (verifiedIndex > -1 && completedIndex === -1) {
        isVerified = true;
        statuses.splice(verifiedIndex, 1);
        statuses.push('Completed');
      }

      filter = buildStatusesFilterString(statuses);
      return filter + ' AND verified=' + isVerified;
    }

    /**
     * Get default states for model.
     * @param {String} model - The model name
     * @return {Array} List of default states for model
     */
    function getDefaultStatesForModel(model) {
      return GGRC.Utils.CurrentPage.isMyAssessments() ?
        ['Not Started', 'In Progress'] :
        getStatesForModel(model);
    }

    return {
      hasState: hasState,
      hasFilter: hasFilter,
      statusFilter: statusFilter,
      getStatesForModel: getStatesForModel,
      getDefaultStatesForModel: getDefaultStatesForModel
    };
  })();
})(window.GGRC);
