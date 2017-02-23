# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
update roles in options table

Create Date: 2017-02-13 06:00:17.987416
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from alembic import op

# revision identifiers, used by Alembic.
revision = '19a4d5cfc0b8'
down_revision = '4e43a2374e2c'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  delete_sql = ("DELETE from options where role='product_kind'")
  update_sql = ("UPDATE options set role='product_kind' "
                "where role='product_type'")
  op.execute(delete_sql)
  op.execute(update_sql)


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  update_sql = ("UPDATE options set role='product_type' "
                "where role='product_kind'")
  insert_sql = ("INSERT INTO options (id,role,title,created_at,updated_at) "
                "values(109,'product_kind','Not Applicable',NOW(),NOW())")
  op.execute(update_sql)
  op.execute(insert_sql)
