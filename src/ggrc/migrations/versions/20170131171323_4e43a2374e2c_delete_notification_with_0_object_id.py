# Copyright (C) 2017 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
delete notification with 0 object_id

Create Date: 2017-01-31 17:13:23.103263
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from alembic import op


# revision identifiers, used by Alembic.
revision = '4e43a2374e2c'
down_revision = '4aa9f2ee7969'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  connection = op.get_bind()
  connection.execute("DELETE FROM notifications WHERE object_id=0;")


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  pass
