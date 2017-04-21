# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>


"""Tests for task group task specific export."""
from ggrc import db
from ggrc.models import all_models
from integration.ggrc.models import factories
from integration.ggrc import TestCase


class TestExportControls(TestCase):
  """Test imports for basic control objects."""

  model = all_models.Control

  def setUp(self):
    with factories.single_commit():
      super(TestExportControls, self).setUp()
      self.client.get("/login")
      self.headers = {
          'Content-Type': 'application/json',
          "X-Requested-By": "GGRC",
          "X-export-view": "blocks",
      }
      self.basic_owner = factories.PersonFactory(name="basic owner")
      self.control = factories.ControlFactory()
      self.owner_object = factories.OwnerFactory(person=self.basic_owner,
                                                 ownable=self.control)

  def test_search_by_owner_email(self):
    self.assert_slugs("owners",
                      self.basic_owner.email,
                      [self.control.slug])

  def test_search_by_owner_name(self):
    self.assert_slugs("owners",
                      self.basic_owner.name,
                      [self.control.slug])

  def test_search_by_new_owner(self):
    """Filter by added new owner and old owner"""
    basic_email, basic_name = self.basic_owner.email, self.basic_owner.name
    new_owner = factories.PersonFactory(name="new owner")
    factories.OwnerFactory(person=new_owner, ownable=self.control)
    self.assert_slugs("owners",
                      new_owner.email,
                      [self.control.slug])
    self.assert_slugs("owners",
                      new_owner.name,
                      [self.control.slug])
    self.assert_slugs("owners",
                      basic_email,
                      [self.control.slug])
    self.assert_slugs("owners",
                      basic_name,
                      [self.control.slug])

  def test_search_by_deleted_owner(self):
    """Filter by deleted owner"""
    db.session.delete(self.owner_object)
    db.session.commit()
    self.assert_slugs("owners", self.basic_owner.email, [])
    self.assert_slugs("owners", self.basic_owner.name, [])
