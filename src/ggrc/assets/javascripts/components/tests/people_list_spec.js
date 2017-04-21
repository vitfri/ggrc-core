/*!
  Copyright (C) 2017 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

describe('GGRC.Components.peopleGroup', function () {
  'use strict';

  var Component;  // the component under test

  beforeAll(function () {
    Component = GGRC.Components.get('peopleGroup');
  });

  describe('get_pending() method', function () {
    var getPending;  // the method under test
    var scope;
    var pendingJoinsList = [{}, {}];  // some arbitrary values
    var result;

    beforeEach(function () {
      scope = new can.Map({
        instance: new can.Map({
          _pending_joins: pendingJoinsList
        })
      });
      getPending = Component.prototype.scope.get_pending.bind(scope);
    });

    it('returns [] if "deferred" is not set',
       function () {
         result = getPending();

         expect(result).toEqual([]);
       }
      );

    it('returns pending joins list if "deferred" is set',
       function () {
         scope.attr('deferred', 'true');

         result = getPending();

         expect(result).toEqual(scope.attr('instance._pending_joins'));
       });
  });

  describe('get_mapped() method', function () {
    var getMapped;  // the method under test
    var scope;
    var mappingsList = [{}, {}];  // some arbitrary values
    var deferred = $.Deferred();

    beforeEach(function () {
      scope = new can.Map({
        computed_mapping: false,
        mapping: 'some mapping',
        instance: new can.Map({
          get_mapping_deferred: function () {}
        })
      });
      mappingsList = scope.attr('mappingsList', mappingsList);

      spyOn(scope.instance, 'get_mapping_deferred')
        .and
        .returnValue(deferred.resolve(mappingsList));

      getMapped = Component.prototype.scope.get_mapped_deferred.bind(scope);
    });

    it('returns mappings and sets "computed_mapping" to true',
       function () {
         getMapped().then(function (data) {
           expect(data).toEqual(mappingsList);
           expect(scope.attr('list_mapped')).toEqual(mappingsList);
           expect(scope.computed_mapping).toEqual(true);
           expect(scope.instance.get_mapping_deferred)
             .toHaveBeenCalledWith(scope.mapping);
         });
       });

    it('does not call instance.get_mapping_deferred if "computed_mapping"',
       function () {
         scope.computed_mapping = true;
         scope.attr('list_mapped', mappingsList);

         getMapped().then(function (data) {
           expect(data).toEqual(scope.attr('list_mapped'));
           expect(scope.instance.get_mapping_deferred).not.toHaveBeenCalled();
         });
       });
  });

  describe('get_pending_operation() method', function () {
    var getPendingOperation;  // the method under test

    var person = function (name) {
      return {name: name};
    };
    var person1 = person('Person 1');
    var person2 = person('Person 2');
    var pendingJoinPerson1 = {
      name: 'Pending join for Person 1',
      what: person1
    };
    var pendingJoinPerson2First = {
      name: 'Pending join for Person 2 (expected one)',
      what: person2
    };
    var pendingJoinPerson2Last = {
      name: 'Pending join for Person 2',
      what: person2
    };
    var pendingJoinsList = [
      pendingJoinPerson1,
      pendingJoinPerson2First,
      pendingJoinPerson2Last
    ];
    var scope;
    var result;

    beforeEach(function () {
      scope = new can.Map({
        get_pending: function () {
          return pendingJoinsList;
        }
      });
      getPendingOperation = Component.prototype.scope
        .get_pending_operation.bind(scope);
    });

    it('returns a pending join for a person',
       function () {
         result = getPendingOperation(person1);

         expect(result).toEqual(pendingJoinPerson1);
       });

    it('returns the first pending join for a person that has several',
       function () {
         result = getPendingOperation(person2);

         expect(result).toEqual(pendingJoinPerson2First);
       });

    it('returns undefined for a person with no pending joins',
       function () {
         result = getPendingOperation(person('John Doe'));

         expect(result).toBeUndefined();
       });
  });

  describe('parse_roles_list() method', function () {
    var parseRolesList;  // the method under test
    var operation;
    var result;

    beforeEach(function () {
      parseRolesList = Component.prototype.scope.parse_roles_list;
      operation = {extra: {attrs: {AssigneeType: undefined}}};
    });

    it('splits comma-separated string into a list',
       function () {
         operation.extra.attrs.AssigneeType = 'Assignee,Creator';

         result = parseRolesList(operation);

         expect(result).toEqual(['Assignee', 'Creator']);
       });

    it('returns a string without commas embedded in a list',
       function () {
         operation.extra.attrs.AssigneeType = 'Assignee';

         result = parseRolesList(operation);

         expect(result).toEqual(['Assignee']);
       });

    it('returns [] if no roles are stored in the operation',
       function () {
         operation.extra.attrs = undefined;

         result = parseRolesList(operation);

         expect(result).toEqual([]);
       });
  });

  describe('remove_role() method', function () {
    var removeRole;
    var personMock;
    var scope;
    var el;
    var result;
    var instance;

    beforeEach(function () {
      result = {
        relationship: {
          attrs: new can.Map(),
          destroy: function () {},
          save: function () {}
        }
      };
      instance = {
        refresh: jasmine.createSpy()
      };
      scope = new can.Map({
        type: 'Verifier',
        instance: instance,
        deferred_remove_role: jasmine.createSpy(),
        get_roles: function () {
          return can.Deferred().resolve(result);
        },
        enabledEdit: true,
        confirmEdit: function () {
          if (scope.attr('enabledEdit')) {
            return can.Deferred().resolve();
          }
          return can.Deferred().reject();
        }
      });
      instance = scope.attr('instance');
      removeRole = Component.prototype.scope.remove_role.bind(scope);
      personMock = {
        name: 'person'
      };
      el = $('<li><div class="person-tooltip-trigger">DIV</div></li>');
      spyOn(CMS.Models.Person, 'findInCacheById')
        .and.returnValue(personMock);
      spyOn(result.relationship, 'destroy')
        .and.returnValue(can.Deferred().resolve());
      spyOn(result.relationship, 'save')
        .and.returnValue(can.Deferred().resolve());
    });
    it('removes class .person-tooltip-trigger', function () {
      $('body').append(el);
      scope.attr('deferred', true);
      removeRole({}, el, {});
      expect($(el).closest('li').find('.person-tooltip-trigger').length)
        .toEqual(0);
      $('body').html('');
    });
    it('adds class "hidden" to event element', function () {
      $('body').append(el);
      scope.attr('deferred', true);
      removeRole({}, el, {});
      expect($(el).hasClass('hidden')).toEqual(true);
      $('body').html('');
    });
    it('calls deferred_remove_role if deferred is true', function () {
      scope.attr('deferred', true);
      removeRole({}, el, {});
      expect(scope.deferred_remove_role)
        .toHaveBeenCalledWith(personMock, 'Verifier');
    });
    it('destroys relationship if it has only removing role', function () {
      scope.attr('deferred', false);
      result.roles = ['Verifier'];
      removeRole({}, el, {});
      expect(result.relationship.destroy)
        .toHaveBeenCalled();
    });
    it('calls refresh of instance if relationship has only removing role',
      function () {
        scope.attr('deferred', false);
        result.roles = ['Verifier'];
        removeRole({}, el, {});
        expect(instance.refresh)
          .toHaveBeenCalled();
      });
    it('save relationship if it has multiple roles', function () {
      scope.attr('deferred', false);
      result.roles = ['Verifier', 'Assessor', 'Creator'];
      removeRole({}, el, {});
      expect(result.relationship.save)
        .toHaveBeenCalled();
    });
    it('adds joined roles to relationship.attrs.AssigneeType' +
    ' if relationship has multiple roles', function () {
      scope.attr('deferred', false);
      result.roles = ['Verifier', 'Assessor', 'Creator'];
      removeRole({}, el, {});
      expect(result.relationship.attrs.attr('AssigneeType'))
        .toEqual('Assessor,Creator');
    });
    it('calls refresh of instance if relationship has multiple roles',
    function () {
      scope.attr('deferred', false);
      result.roles = ['Verifier', 'Assessor', 'Creator'];
      removeRole({}, el, {});
      expect(instance.refresh)
        .toHaveBeenCalled();
    });
    it('relationship was not saved if editing was not confirmed', function () {
      scope.attr('enabledEdit', false);
      removeRole({}, el, {});
      expect(result.relationship.save)
        .not.toHaveBeenCalled();
    });
    it('does nothing if relationship is undefined', function () {
      function foo() {
        result = {};
        scope.attr('deferred', false);
        removeRole({}, el, {});
      }
      expect(foo).not.toThrowError(TypeError);
    });
  });

  describe('deferred_add_role() method', function () {
    var deferredAddRole;  // the method under test
    var personMock;
    var role;
    var getRolesMockResult;
    var pendingOperationMock;
    var scope;

    beforeEach(function () {
      personMock = {type: 'The person object'};
      role = 'Role to add';
      scope = new can.Map({
        get_roles: function () {},
        get_pending_operation: function () {},
        add_or_replace_operation: function () {},
        parse_roles_list: Component.prototype.scope.parse_roles_list
      });

      pendingOperationMock = {extra: {attrs: {}}};
      spyOn(scope, 'get_pending_operation')
        .and.returnValue(pendingOperationMock);
      getRolesMockResult = {
        roles: [],
        then: function (cb) {
          return cb(getRolesMockResult);
        }
      };
      spyOn(scope, 'get_roles').and.returnValue(getRolesMockResult);
      spyOn(scope, 'add_or_replace_operation');

      deferredAddRole = Component.prototype.scope.deferred_add_role.bind(scope);
    });

    it('creates a new "add" with no pending operation and no stored roles',
       function () {
         scope.get_pending_operation.and.stub();
         deferredAddRole(personMock, role);

         expect(scope.get_roles).toHaveBeenCalledWith(personMock,
                                                      scope.instance);
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'add',
             roles: [role]
           }
         );
       });

    it('creates a new "update" with no pending operation and with stored roles',
       function () {
         scope.get_pending_operation.and.stub();
         getRolesMockResult.roles = ['Stored role'];

         deferredAddRole(personMock, role);

         expect(scope.get_roles).toHaveBeenCalledWith(personMock,
                                                      scope.instance);
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'update',
             roles: ['Stored role', role]
           }
         );
       });

    it('creates a new "update" if pending "remove"',
       function () {
         pendingOperationMock.how = 'remove';

         deferredAddRole(personMock, role);

         expect(scope.get_roles).not.toHaveBeenCalled();
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'update',
             roles: [role]
           }
         );
       });

    it('updates roles list in a pending "update"',
       function () {
         pendingOperationMock.how = 'update';
         pendingOperationMock.extra.attrs.AssigneeType = 'Pending role';

         deferredAddRole(personMock, role);

         expect(scope.get_roles).not.toHaveBeenCalled();
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'update',
             roles: ['Pending role', role]
           }
         );
       });

    it('updates roles list in a pending "add"',
       function () {
         pendingOperationMock.how = 'add';
         pendingOperationMock.extra.attrs.AssigneeType = 'Pending role';

         deferredAddRole(personMock, role);

         expect(scope.get_roles).not.toHaveBeenCalled();
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'add',
             roles: ['Pending role', role]
           }
         );
       });
  });

  describe('deferred_remove_role() method', function () {
    var deferredRemoveRole;  // the method under test
    var personMock;
    var role;
    var getRolesMockResult;
    var pendingOperationMock;
    var scope;

    beforeEach(function () {
      personMock = {type: 'The person object'};
      role = 'Role to remove';
      scope = new can.Map({
        get_roles: function () {},
        get_pending_operation: function () {},
        add_or_replace_operation: function () {},
        parse_roles_list: Component.prototype.scope.parse_roles_list
      });

      pendingOperationMock = {extra: {attrs: {}}};
      spyOn(scope, 'get_pending_operation')
        .and.returnValue(pendingOperationMock);
      getRolesMockResult = {
        roles: [],
        then: function (cb) {
          return cb(getRolesMockResult);
        }
      };
      spyOn(scope, 'get_roles').and.returnValue(getRolesMockResult);
      spyOn(scope, 'add_or_replace_operation');

      deferredRemoveRole = Component.prototype.scope
        .deferred_remove_role.bind(scope);
    });

    it('deletes a role from pending roles with a pending "add"',
       function () {
         pendingOperationMock.how = 'add';
         pendingOperationMock.extra.attrs.AssigneeType =
           'Role to remove,Another role';

         deferredRemoveRole(personMock, role);

         expect(scope.get_roles).not.toHaveBeenCalled();
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'add',
             roles: ['Another role']
           }
         );
       });

    it('cancels a pending single role "add"',
       function () {
         pendingOperationMock.how = 'add';
         pendingOperationMock.extra.attrs.AssigneeType = 'Role to remove';

         deferredRemoveRole(personMock, role);

         expect(scope.get_roles).not.toHaveBeenCalled();
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           null
         );
       });

    it('deletes a role from pending roles with a pending "update"',
       function () {
         pendingOperationMock.how = 'update';
         pendingOperationMock.extra.attrs.AssigneeType =
           'Role to remove,Another role';

         deferredRemoveRole(personMock, role);

         expect(scope.get_roles).not.toHaveBeenCalled();
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'update',
             roles: ['Another role']
           }
         );
       });

    it('creates a "remove" with a pending single role "update"',
       function () {
         pendingOperationMock.how = 'update';
         pendingOperationMock.extra.attrs.AssigneeType = 'Role to remove';

         deferredRemoveRole(personMock, role);

         expect(scope.get_roles).not.toHaveBeenCalled();
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'remove'
           }
         );
       });

    it('does nothing if "remove" is pending',
       function () {
         pendingOperationMock.how = 'remove';

         deferredRemoveRole(personMock, role);

         expect(scope.get_roles).not.toHaveBeenCalled();
         expect(scope.add_or_replace_operation).not.toHaveBeenCalled();
       });

    it('creates an "update" with no pending joins and several stored roles',
       function () {
         scope.get_pending_operation.and.stub();
         getRolesMockResult.roles = ['Role to remove', 'Another role'];

         deferredRemoveRole(personMock, role);

         expect(scope.get_roles).toHaveBeenCalledWith(personMock,
                                                      scope.instance);
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'update',
             roles: ['Another role']
           }
         );
       });

    it('creates a "remove" with no pending joins and a single stored role',
       function () {
         scope.get_pending_operation.and.stub();
         getRolesMockResult.roles = ['Role to remove'];

         deferredRemoveRole(personMock, role);

         expect(scope.get_roles).toHaveBeenCalledWith(personMock,
                                                      scope.instance);
         expect(scope.add_or_replace_operation).toHaveBeenCalledWith(
           personMock,
           {
             how: 'remove'
           }
         );
       });
  });
  describe('enableEdit() method', function () {
    var enableEdit;
    var scope;
    var event;

    beforeEach(function () {
      scope = new can.Map({
        confirmEdit: function () {
          if (scope.attr('enabledEdit')) {
            return can.Deferred().resolve();
          }
          return can.Deferred().reject();
        }
      });
      enableEdit = Component.prototype.scope.enableEdit.bind(scope);
      event = $.Event('click');
    });

    it('isEdit should be truthy when editing was confirmed', function () {
      var result;
      scope.attr('enabledEdit', true);
      enableEdit(scope, {}, event);
      result = scope.attr('isEdit');
      expect(result).toBeTruthy();
    });

    it('isEdit should be falsy when editing was confirmed', function () {
      var result;
      scope.attr('enabledEdit', false);
      enableEdit(scope, {}, event);
      result = scope.attr('isEdit');
      expect(result).toBeFalsy();
    });
  });
  describe('disableEdit() method', function () {
    var disableEdit;
    var scope;

    beforeEach(function () {
      scope = new can.Map({
        isEdit: false
      });
      disableEdit = Component.prototype.scope.disableEdit.bind(scope);
    });

    it('isEdit should be falsy', function () {
      var result;
      disableEdit();
      result = scope.attr('isEdit');
      expect(result).toBeFalsy();
    });
  });
});
