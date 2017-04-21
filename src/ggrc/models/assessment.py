# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for Assessment object"""

from sqlalchemy import and_
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import remote
from sqlalchemy.orm import validates

from ggrc import db
from ggrc.models import reflection
from ggrc.models.comment import Commentable
from ggrc.models.custom_attribute_definition import CustomAttributeDefinition
from ggrc.models.mixins.audit_relationship import AuditRelationship
from ggrc.models.mixins import BusinessObject
from ggrc.models.mixins import CustomAttributable
from ggrc.models.mixins import FinishedDate
from ggrc.models.mixins import Notifiable
from ggrc.models.mixins import TestPlanned
from ggrc.models.mixins import Timeboxed
from ggrc.models.mixins import VerifiedDate
from ggrc.models.mixins import reminderable
from ggrc.models.mixins import statusable
from ggrc.models.mixins.assignable import Assignable
from ggrc.models.mixins.autostatuschangeable import AutoStatusChangeable
from ggrc.models.mixins.validate_on_complete import ValidateOnComplete
from ggrc.models.mixins.with_similarity_score import WithSimilarityScore
from ggrc.models.deferred import deferred
from ggrc.models.object_document import EvidenceURL
from ggrc.models.object_person import Personable
from ggrc.models.reflection import PublishOnly
from ggrc.models.relationship import Relatable
from ggrc.models.relationship import Relationship
from ggrc.models.track_object_state import HasObjectState
from ggrc.fulltext.mixin import Indexed, ReindexRule
from ggrc.fulltext.attributes import MultipleSubpropertyFullTextAttr


def reindex_by_relationship_attr(relationship_attr):
  """Return a list of assessments which which need to be reindexed

  In case RelationshipAttr changed
  """
  source_query = db.session.query(Relationship.source_id).filter(
      Relationship.source_type == "Assessment",
      Relationship.id == relationship_attr.relationship_id
  )
  dest_query = db.session.query(Relationship.destination_id).filter(
      Relationship.destination_type == "Assessment",
      Relationship.id == relationship_attr.relationship_id
  )
  resulting_subquery = source_query.union(dest_query)
  return Assessment.query.filter(Assessment.id.in_(resulting_subquery)).all()


def reindex_by_relationship(relationship):
  """Return a list of assessments which which need to be reindexed

  In case Relationship changed or created or deleted
  """
  source_type = relationship.source_type
  destination_type = relationship.destination_type
  if destination_type == "Assessment" and source_type == "Document":
    instance = relationship.destination
  elif source_type == "Assessment" and destination_type == "Document":
    instance = relationship.source
  else:
    return []
  if isinstance(instance, (Indexed, Commentable)):
    return [instance]
  return []


class Assessment(statusable.Statusable, AuditRelationship,
                 AutoStatusChangeable, Assignable, HasObjectState, TestPlanned,
                 CustomAttributable, EvidenceURL, Commentable, Personable,
                 reminderable.Reminderable, Timeboxed, Relatable,
                 WithSimilarityScore, FinishedDate, VerifiedDate,
                 ValidateOnComplete, Notifiable, BusinessObject, Indexed,
                 db.Model):
  """Class representing Assessment.

  Assessment is an object representing an individual assessment performed on
  a specific object during an audit to ascertain whether or not
  certain conditions were met for that object.
  """

  __tablename__ = 'assessments'
  _title_uniqueness = False

  ASSIGNEE_TYPES = (u"Creator", u"Assessor", u"Verifier")

  REMINDERABLE_HANDLERS = {
      "statusToPerson": {
          "handler":
              reminderable.Reminderable.handle_state_to_person_reminder,
          "data": {
              statusable.Statusable.START_STATE: "Assessor",
              "In Progress": "Assessor"
          },
          "reminders": {"assessment_assessor_reminder", }
      }
  }

  design = deferred(db.Column(db.String), "Assessment")
  operationally = deferred(db.Column(db.String), "Assessment")
  audit_id = deferred(
      db.Column(db.Integer, db.ForeignKey('audits.id'), nullable=False),
      'Assessment')

  @declared_attr
  def object_level_definitions(self):
    """Set up a backref so that we can create an object level custom
       attribute definition without the need to do a flush to get the
       assessment id.

      This is used in the relate_ca method in hooks/assessment.py.
    """
    return db.relationship(
        'CustomAttributeDefinition',
        primaryjoin=lambda: and_(
            remote(CustomAttributeDefinition.definition_id) == Assessment.id,
            remote(CustomAttributeDefinition.definition_type) == "assessment"),
        foreign_keys=[
            CustomAttributeDefinition.definition_id,
            CustomAttributeDefinition.definition_type
        ],
        backref='assessment_definition',
        cascade='all, delete-orphan')

  object = {}  # we add this for the sake of client side error checking

  VALID_CONCLUSIONS = frozenset([
      "Effective",
      "Ineffective",
      "Needs improvement",
      "Not Applicable"
  ])

  # REST properties
  _publish_attrs = [
      'design',
      'operationally',
      'audit',
      PublishOnly('object')
  ]

  _fulltext_attrs = [
      'design',
      'operationally',
      MultipleSubpropertyFullTextAttr('related_assessors', 'assessors',
                                      ['user_name', 'email', 'name']),
      MultipleSubpropertyFullTextAttr('related_creators', 'creators',
                                      ['user_name', 'email', 'name']),
      MultipleSubpropertyFullTextAttr('related_verifiers', 'verifiers',
                                      ['user_name', 'email', 'name']),
      MultipleSubpropertyFullTextAttr('document_evidence', 'document_evidence',
                                      ['title', 'link']),
      MultipleSubpropertyFullTextAttr('document_url', 'document_url',
                                      ['link']),
  ]

  _tracked_attrs = {
      'contact_id',
      'description',
      'design',
      'notes',
      'operationally',
      'reference_url',
      'secondary_contact_id',
      'test_plan',
      'title',
      'url',
      'start_date',
      'end_date'
  }

  _aliases = {
      "owners": None,
      "assessment_template": {
          "display_name": "Template",
          "ignore_on_update": True,
          "filter_by": "_ignore_filter",
          "type": reflection.AttributeInfo.Type.MAPPING,
      },
      "url": "Assessment URL",
      "design": "Conclusion: Design",
      "operationally": "Conclusion: Operation",
      "related_creators": {
          "display_name": "Creators",
          "mandatory": True,
          "type": reflection.AttributeInfo.Type.MAPPING,
      },
      "related_assessors": {
          "display_name": "Assignees",
          "mandatory": True,
          "type": reflection.AttributeInfo.Type.MAPPING,
      },
      "related_verifiers": {
          "display_name": "Verifiers",
          "type": reflection.AttributeInfo.Type.MAPPING,
      },
  }

  AUTO_REINDEX_RULES = [
      ReindexRule("RelationshipAttr", reindex_by_relationship_attr),
      ReindexRule("Relationship", reindex_by_relationship)
  ]

  similarity_options = {
      "relevant_types": {
          "Objective": {"weight": 2},
          "Control": {"weight": 2},
      },
      "threshold": 1,
  }

  @property
  def assessors(self):
    """Get the list of assessor assignees"""
    return self.assignees_by_type.get("Assessor", [])

  @property
  def creators(self):
    """Get the list of creator assignees"""
    return self.assignees_by_type.get("Creator", [])

  @property
  def verifiers(self):
    """Get the list of verifier assignees"""
    return self.assignees_by_type.get("Verifier", [])

  @property
  def document_evidence(self):
    return self.documents_by_type("document_evidence")

  @property
  def document_url(self):
    return self.documents_by_type("document_url")

  def validate_conclusion(self, value):
    return value if value in self.VALID_CONCLUSIONS else None

  @validates("operationally")
  def validate_opperationally(self, key, value):
    # pylint: disable=unused-argument
    return self.validate_conclusion(value)

  @validates("design")
  def validate_design(self, key, value):
    # pylint: disable=unused-argument
    return self.validate_conclusion(value)

  @classmethod
  def _ignore_filter(cls, _):
    return None
