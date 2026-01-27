# Mochi Projects app
# Copyright Alistair Cunningham 2026

# Create database with all 14 tables
def database_create():
	# 1. projects - the container, a Mochi entity
	mochi.db.execute("""create table if not exists projects (
		id text primary key,
		name text not null,
		description text not null default '',
		prefix text not null default 'PROJ',
		counter integer not null default 0,
		owner integer not null default 1,
		server text not null default '',
		created integer not null,
		updated integer not null
	)""")

	# 2. subscribers - subscribers to owned projects
	mochi.db.execute("""create table if not exists subscribers (
		project text not null references projects(id),
		id text not null,
		name text not null default '',
		subscribed integer not null,
		primary key (project, id)
	)""")
	mochi.db.execute("create index if not exists subscribers_id on subscribers(id)")

	# 3. types - object types (Task, Subproject, Pull Request, etc.)
	mochi.db.execute("""create table if not exists types (
		project text not null references projects(id),
		id text not null,
		name text not null,
		sort integer not null default 0,
		primary key (project, id)
	)""")
	mochi.db.execute("create index if not exists types_project on types(project)")

	# 4. hierarchy - hierarchy rules (what can be parent of what)
	mochi.db.execute("""create table if not exists hierarchy (
		project text not null references projects(id),
		type text not null,
		parent text not null default '',
		primary key (project, type, parent),
		foreign key (project, type) references types(project, id)
	)""")
	mochi.db.execute("create index if not exists hierarchy_project on hierarchy(project)")

	# 5. fields - field definitions per type
	mochi.db.execute("""create table if not exists fields (
		project text not null references projects(id),
		type text not null,
		id text not null,
		name text not null,
		fieldtype text not null,
		required integer not null default 0,
		multi integer not null default 0,
		sort integer not null default 0,
		min text not null default '',
		max text not null default '',
		pattern text not null default '',
		minlength integer not null default 0,
		maxlength integer not null default 0,
		prefix text not null default '',
		suffix text not null default '',
		format text not null default '',
		card integer not null default 1,
		position text not null default '',
		primary key (project, type, id),
		foreign key (project, type) references types(project, id)
	)""")
	mochi.db.execute("create index if not exists fields_project on fields(project)")
	mochi.db.execute("create index if not exists fields_type on fields(project, type)")

	# 6. options - enum options for enum fields
	mochi.db.execute("""create table if not exists options (
		project text not null references projects(id),
		type text not null,
		field text not null,
		id text not null,
		name text not null,
		colour text not null default '',
		icon text not null default '',
		sort integer not null default 0,
		primary key (project, type, field, id),
		foreign key (project, type, field) references fields(project, type, id)
	)""")
	mochi.db.execute("create index if not exists options_field on options(project, type, field)")

	# 7. views - board, list, table configurations
	mochi.db.execute("""create table if not exists views (
		project text not null references projects(id),
		id text not null,
		name text not null,
		viewtype text not null default 'board',
		filter text not null default '',
		columns text not null default '',
		rows text not null default '',
		cardfields text not null default '',
		sort text not null default '',
		direction text not null default 'asc',
		primary key (project, id)
	)""")
	mochi.db.execute("create index if not exists views_project on views(project)")

	# 8. objects - the actual tasks, epics, etc.
	mochi.db.execute("""create table if not exists objects (
		id text primary key,
		project text not null references projects(id),
		type text not null,
		number integer not null,
		parent text not null default '',
		created integer not null,
		updated integer not null,
		foreign key (project, type) references types(project, id)
	)""")
	mochi.db.execute("create index if not exists objects_project on objects(project)")
	mochi.db.execute("create index if not exists objects_type on objects(project, type)")
	mochi.db.execute("create index if not exists objects_parent on objects(parent)")
	mochi.db.execute("create index if not exists objects_created on objects(created)")
	mochi.db.execute("create index if not exists objects_updated on objects(updated)")

	# 9. links - links between objects (blocks, relates to, duplicates, etc.)
	mochi.db.execute("""create table if not exists links (
		project text not null references projects(id),
		source text not null references objects(id),
		target text not null references objects(id),
		linktype text not null,
		created integer not null,
		primary key (source, target, linktype)
	)""")
	mochi.db.execute("create index if not exists links_source on links(source)")
	mochi.db.execute("create index if not exists links_target on links(target)")

	# 10. values - field values on objects
	mochi.db.execute("""create table if not exists "values" (
		object text not null references objects(id),
		field text not null,
		value text not null default '',
		primary key (object, field)
	)""")
	mochi.db.execute("create index if not exists values_object on \"values\"(object)")

	# 11. comments - comments on objects
	mochi.db.execute("""create table if not exists comments (
		id text primary key,
		object text not null references objects(id),
		parent text not null default '',
		author text not null,
		name text not null,
		content text not null,
		created integer not null,
		edited integer not null default 0
	)""")
	mochi.db.execute("create index if not exists comments_object on comments(object)")
	mochi.db.execute("create index if not exists comments_parent on comments(parent)")
	mochi.db.execute("create index if not exists comments_created on comments(created)")

	# 12. activity - activity history on objects
	mochi.db.execute("""create table if not exists activity (
		id text primary key,
		object text not null references objects(id),
		actor text not null,
		action text not null,
		field text not null default '',
		oldvalue text not null default '',
		newvalue text not null default '',
		created integer not null
	)""")
	mochi.db.execute("create index if not exists activity_object on activity(object)")
	mochi.db.execute("create index if not exists activity_created on activity(created)")

	# 13. watchers - users subscribed to object updates
	mochi.db.execute("""create table if not exists watchers (
		object text not null references objects(id),
		user text not null,
		created integer not null,
		primary key (object, user)
	)""")
	mochi.db.execute("create index if not exists watchers_user on watchers(user)")

	# 14. attachments - file attachments on objects (uses Mochi attachment system)
	# Note: Mochi handles attachments internally, but we track metadata here
	mochi.db.execute("""create table if not exists attachments (
		id text primary key,
		object text not null references objects(id),
		name text not null,
		size integer not null default 0,
		mimetype text not null default '',
		created integer not null
	)""")
	mochi.db.execute("create index if not exists attachments_object on attachments(object)")


# Upgrade database schema
def database_upgrade(to_version):
	# No upgrades needed yet for schema version 1
	pass


# ============================================================================
# Templates
# ============================================================================

# Get available project templates
def get_templates():
	return {
		"simple": {
			"id": "simple",
			"name": "Simple",
			"description": "A simple task board with To do, In progress, Review, and Done columns."
		}
	}

# Apply the "simple" template to a project
def apply_template_simple(project_id):
	# Create "task" type
	mochi.db.execute(
		"insert into types (project, id, name, sort) values (?, ?, ?, ?)",
		project_id, "task", "Task", 0
	)

	# Set hierarchy: task can be root (empty parent means root-level allowed)
	mochi.db.execute(
		"insert into hierarchy (project, type, parent) values (?, ?, ?)",
		project_id, "task", ""
	)

	# Create fields for task type
	fields = [
		("title", "Title", "text", 1, 0),
		("description", "Description", "text", 0, 1),
		("status", "Status", "enum", 1, 2),
		("priority", "Priority", "enum", 0, 3),
		("assignee", "Assignee", "user", 0, 4),
		("due", "Due", "date", 0, 5),
	]
	for field_id, name, fieldtype, required, sort in fields:
		card = 1 if field_id != "description" else 0
		mochi.db.execute(
			"insert into fields (project, type, id, name, fieldtype, required, card, sort) values (?, ?, ?, ?, ?, ?, ?, ?)",
			project_id, "task", field_id, name, fieldtype, required, card, sort
		)

	# Create status options
	status_options = [
		("todo", "To do", "#94a3b8", 0),
		("progress", "In progress", "#fbbf24", 1),
		("review", "Review", "#a78bfa", 2),
		("done", "Done", "#4ade80", 3),
	]
	for opt_id, name, colour, sort in status_options:
		mochi.db.execute(
			"insert into options (project, type, field, id, name, colour, sort) values (?, ?, ?, ?, ?, ?, ?)",
			project_id, "task", "status", opt_id, name, colour, sort
		)

	# Create priority options
	priority_options = [
		("low", "Low", "#94a3b8", 0),
		("medium", "Medium", "#fbbf24", 1),
		("high", "High", "#f87171", 2),
	]
	for opt_id, name, colour, sort in priority_options:
		mochi.db.execute(
			"insert into options (project, type, field, id, name, colour, sort) values (?, ?, ?, ?, ?, ?, ?)",
			project_id, "task", "priority", opt_id, name, colour, sort
		)

	# Create default board view
	mochi.db.execute(
		"insert into views (project, id, name, viewtype, columns, cardfields) values (?, ?, ?, ?, ?, ?)",
		project_id, "board", "Board", "board", "status", "title,priority,assignee,due"
	)

	# Create default list view
	mochi.db.execute(
		"insert into views (project, id, name, viewtype, columns, cardfields, sort, direction) values (?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, "list", "List", "list", "", "title,status,priority,assignee,due", "number", "desc"
	)


# ============================================================================
# Project Actions
# ============================================================================

# List available templates
def action_templates(a):
	if not a.user:
		a.error(401, "Not logged in")
		return
	return {"data": {"templates": list(get_templates().values())}}

# List user's projects
def action_project_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	rows = mochi.db.rows("select id, name, description, prefix, owner, server, created, updated from projects order by updated desc")
	projects = []
	for row in rows or []:
		projects.append({
			"id": row["id"],
			"fingerprint": mochi.entity.fingerprint(row["id"]),
			"name": row["name"],
			"description": row["description"],
			"prefix": row["prefix"],
			"owner": row["owner"],
			"server": row["server"],
			"created": row["created"],
			"updated": row["updated"],
		})
	return {"data": {"projects": projects}}

# Create a new project
def action_project_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	name = a.input("name")
	if not name or not mochi.valid(name, "name"):
		a.error(400, "Invalid name")
		return

	template = a.input("template")
	if not template:
		a.error(400, "Template is required")
		return

	templates = get_templates()
	if template not in templates:
		a.error(400, "Invalid template")
		return

	description = a.input("description") or ""
	prefix = a.input("prefix") or "PROJ"
	privacy = a.input("privacy") or "private"

	# Create Mochi entity
	entity = mochi.entity.create("project", name, privacy, description)
	if not entity:
		a.error(500, "Failed to create project entity")
		return

	now = mochi.time.now()
	creator = a.user.identity.id

	# Insert project record
	mochi.db.execute(
		"insert into projects (id, name, description, prefix, counter, owner, server, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		entity, name, description, prefix, 0, 1, "", now, now
	)

	# Add creator as subscriber
	mochi.db.execute(
		"insert into subscribers (project, id, name, subscribed) values (?, ?, ?, ?)",
		entity, creator, a.user.identity.name, now
	)

	# Apply template
	if template == "simple":
		apply_template_simple(entity)

	# Set up access control
	resource = "project/" + entity
	if privacy == "public":
		mochi.access.allow("*", resource, "view", creator)
		mochi.access.allow("+", resource, "comment", creator)
	mochi.access.allow(creator, resource, "*", creator)

	return {"data": {"id": entity, "fingerprint": mochi.entity.fingerprint(entity)}}

# Get project details
def action_project_get(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = a.input("project")
	if not project_id:
		a.error(400, "Project ID required")
		return

	# Resolve fingerprint to full ID if needed
	if len(project_id) == 9:
		project_id = mochi.entity.resolve(project_id)
		if not project_id:
			a.error(404, "Project not found")
			return

	row = mochi.db.row("select id, name, description, prefix, counter, owner, server, created, updated from projects where id = ?", project_id)
	if not row:
		a.error(404, "Project not found")
		return

	# Get types
	types = mochi.db.rows("select id, name, sort from types where project = ? order by sort", project_id) or []

	# Get fields by type
	fields = {}
	for t in types:
		type_fields = mochi.db.rows("select id, name, fieldtype, required, multi, sort, card, position from fields where project = ? and type = ? order by sort", project_id, t["id"]) or []
		fields[t["id"]] = type_fields

	# Get options by type and field
	options = {}
	for t in types:
		options[t["id"]] = {}
		for f in fields.get(t["id"], []):
			if f["fieldtype"] == "enum":
				field_options = mochi.db.rows("select id, name, colour, icon, sort from options where project = ? and type = ? and field = ? order by sort", project_id, t["id"], f["id"]) or []
				options[t["id"]][f["id"]] = field_options

	# Get views
	views = mochi.db.rows("select id, name, viewtype, filter, columns, rows, cardfields, sort, direction from views where project = ? order by name", project_id) or []

	# Get hierarchy
	hierarchy = {}
	for t in types:
		parents = mochi.db.rows("select parent from hierarchy where project = ? and type = ?", project_id, t["id"]) or []
		hierarchy[t["id"]] = [p["parent"] for p in parents]

	return {"data": {
		"project": {
			"id": row["id"],
			"fingerprint": mochi.entity.fingerprint(row["id"]),
			"name": row["name"],
			"description": row["description"],
			"prefix": row["prefix"],
			"counter": row["counter"],
			"owner": row["owner"],
			"server": row["server"],
			"created": row["created"],
			"updated": row["updated"],
		},
		"types": types,
		"fields": fields,
		"options": options,
		"views": views,
		"hierarchy": hierarchy,
	}}

# Update project
def action_project_update(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = a.input("project")
	if not project_id:
		a.error(400, "Project ID required")
		return

	if len(project_id) == 9:
		project_id = mochi.entity.resolve(project_id)
		if not project_id:
			a.error(404, "Project not found")
			return

	row = mochi.db.row("select id, owner from projects where id = ?", project_id)
	if not row:
		a.error(404, "Project not found")
		return

	if row["owner"] != 1:
		a.error(403, "Cannot update remote project")
		return

	name = a.input("name")
	description = a.input("description")
	prefix = a.input("prefix")

	now = mochi.time.now()

	if name:
		if not mochi.valid(name, "name"):
			a.error(400, "Invalid name")
			return
		mochi.db.execute("update projects set name = ?, updated = ? where id = ?", name, now, project_id)
		mochi.entity.rename(project_id, name)

	if description != None:
		mochi.db.execute("update projects set description = ?, updated = ? where id = ?", description, now, project_id)

	if prefix:
		mochi.db.execute("update projects set prefix = ?, updated = ? where id = ?", prefix, now, project_id)

	return {"data": {"success": True}}

# Delete project
def action_project_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = a.input("project")
	if not project_id:
		a.error(400, "Project ID required")
		return

	if len(project_id) == 9:
		project_id = mochi.entity.resolve(project_id)
		if not project_id:
			a.error(404, "Project not found")
			return

	row = mochi.db.row("select id, owner from projects where id = ?", project_id)
	if not row:
		a.error(404, "Project not found")
		return

	if row["owner"] != 1:
		a.error(403, "Cannot delete remote project")
		return

	# Delete in reverse dependency order
	mochi.db.execute("delete from attachments where object in (select id from objects where project = ?)", project_id)
	mochi.db.execute("delete from watchers where object in (select id from objects where project = ?)", project_id)
	mochi.db.execute("delete from activity where object in (select id from objects where project = ?)", project_id)
	mochi.db.execute("delete from comments where object in (select id from objects where project = ?)", project_id)
	mochi.db.execute("delete from \"values\" where object in (select id from objects where project = ?)", project_id)
	mochi.db.execute("delete from links where project = ?", project_id)
	mochi.db.execute("delete from objects where project = ?", project_id)
	mochi.db.execute("delete from views where project = ?", project_id)
	mochi.db.execute("delete from options where project = ?", project_id)
	mochi.db.execute("delete from fields where project = ?", project_id)
	mochi.db.execute("delete from hierarchy where project = ?", project_id)
	mochi.db.execute("delete from types where project = ?", project_id)
	mochi.db.execute("delete from subscribers where project = ?", project_id)
	mochi.db.execute("delete from projects where id = ?", project_id)

	# Delete entity
	mochi.entity.delete(project_id)

	return {"data": {"success": True}}


# ============================================================================
# Object Templates
# ============================================================================

def get_object_templates():
	return {
		"blank": {
			"id": "blank",
			"name": "Blank",
			"description": "Empty task with no pre-filled fields.",
			"fields": {}
		},
		"task": {
			"id": "task",
			"name": "Task",
			"description": "General work item.",
			"fields": {
				"status": "todo"
			}
		},
		"ticket": {
			"id": "ticket",
			"name": "Ticket",
			"description": "Support request or general issue.",
			"fields": {
				"status": "todo",
				"priority": "medium",
				"description": "## Summary\n\n## Details\n\n"
			}
		},
		"bug": {
			"id": "bug",
			"name": "Bug",
			"description": "Defect report.",
			"fields": {
				"status": "todo",
				"priority": "high",
				"description": "## Steps to Reproduce\n1. \n2. \n3. \n\n## Expected Behaviour\n\n## Actual Behaviour\n\n## Environment\n"
			}
		},
		"feature": {
			"id": "feature",
			"name": "Feature",
			"description": "Feature request.",
			"fields": {
				"status": "todo",
				"description": "## User Story\nAs a [user], I want [feature] so that [benefit].\n\n## Description\n\n## Acceptance Criteria\n- [ ] \n- [ ] \n- [ ] \n"
			}
		},
		"pull_request": {
			"id": "pull_request",
			"name": "Pull request",
			"description": "Code review request linked to a repository.",
			"fields": {
				"status": "todo",
				"description": "## Changes\n\n## Testing\n\n## Related Issues\n"
			}
		}
	}

def action_object_templates(a):
	if not a.user:
		a.error(401, "Not logged in")
		return
	return {"data": {"templates": list(get_object_templates().values())}}


# ============================================================================
# Helper Functions
# ============================================================================

def resolve_project(a):
	"""Resolve project ID from param, handling fingerprints."""
	project_id = a.input("project")
	if not project_id:
		return None
	if len(project_id) == 9:
		project_id = mochi.entity.resolve(project_id)
	return project_id

def get_project(project_id):
	"""Get project row or None."""
	return mochi.db.row("select * from projects where id = ?", project_id)

def log_activity(object_id, actor, action, field="", oldvalue="", newvalue=""):
	"""Log an activity entry for an object."""
	activity_id = mochi.id()
	now = mochi.time.now()
	mochi.db.execute(
		"insert into activity (id, object, actor, action, field, oldvalue, newvalue, created) values (?, ?, ?, ?, ?, ?, ?, ?)",
		activity_id, object_id, actor, action, field, str(oldvalue), str(newvalue), now
	)


# ============================================================================
# Object Actions
# ============================================================================

def action_object_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	# Get filter params
	type_filter = a.input("type")
	status_filter = a.input("status")
	parent_filter = a.input("parent")

	# Build query
	query = "select o.id, o.project, o.type, o.number, o.parent, o.created, o.updated from objects o where o.project = ?"
	params = [project_id]

	if type_filter:
		query += " and o.type = ?"
		params.append(type_filter)

	if parent_filter != None:
		query += " and o.parent = ?"
		params.append(parent_filter)

	query += " order by o.created desc"

	rows = mochi.db.rows(query, *params) or []

	# Get values for each object
	objects = []
	for row in rows:
		obj = {
			"id": row["id"],
			"project": row["project"],
			"type": row["type"],
			"number": row["number"],
			"parent": row["parent"],
			"created": row["created"],
			"updated": row["updated"],
			"values": {}
		}

		# Get field values
		values = mochi.db.rows("select field, value from \"values\" where object = ?", row["id"]) or []
		for v in values:
			obj["values"][v["field"]] = v["value"]

		# Apply status filter after getting values
		if status_filter and obj["values"].get("status") != status_filter:
			continue

		objects.append(obj)

	return {"data": {"objects": objects}}

def action_object_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	obj_type = a.input("type")
	if not obj_type:
		a.error(400, "Type is required")
		return

	# Verify type exists
	type_row = mochi.db.row("select id from types where project = ? and id = ?", project_id, obj_type)
	if not type_row:
		a.error(400, "Invalid type")
		return

	# Get template and initial values
	template_id = a.input("template") or "blank"
	templates = get_object_templates()
	template = templates.get(template_id, templates["blank"])

	parent = a.input("parent") or ""
	title = a.input("title") or ""

	# Increment counter and get number
	new_counter = project["counter"] + 1
	mochi.db.execute("update projects set counter = ?, updated = ? where id = ?", new_counter, mochi.time.now(), project_id)

	# Create object
	object_id = mochi.id()
	now = mochi.time.now()

	mochi.db.execute(
		"insert into objects (id, project, type, number, parent, created, updated) values (?, ?, ?, ?, ?, ?, ?)",
		object_id, project_id, obj_type, new_counter, parent, now, now
	)

	# Set title if provided
	if title:
		mochi.db.execute("insert into \"values\" (object, field, value) values (?, ?, ?)", object_id, "title", title)

	# Apply template field values
	for field, value in template.get("fields", {}).items():
		if field != "title" or not title:  # Don't overwrite provided title
			mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field, value)

	# Log activity
	log_activity(object_id, a.user.identity.id, "created")

	# Auto-watch creator
	mochi.db.execute("insert into watchers (object, user, created) values (?, ?, ?)", object_id, a.user.identity.id, now)

	return {"data": {
		"id": object_id,
		"number": new_counter,
		"readable": project["prefix"] + "-" + str(new_counter)
	}}

def action_object_get(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select * from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	project = get_project(project_id)

	# Get values
	values = {}
	value_rows = mochi.db.rows("select field, value from \"values\" where object = ?", object_id) or []
	for v in value_rows:
		values[v["field"]] = v["value"]

	# Get links
	links = mochi.db.rows("select target, linktype, created from links where source = ?", object_id) or []
	linked_by = mochi.db.rows("select source, linktype, created from links where target = ?", object_id) or []

	# Check if user is watching
	watching = mochi.db.exists("select 1 from watchers where object = ? and user = ?", object_id, a.user.identity.id)

	return {"data": {
		"object": {
			"id": row["id"],
			"project": row["project"],
			"type": row["type"],
			"number": row["number"],
			"parent": row["parent"],
			"created": row["created"],
			"updated": row["updated"],
			"readable": project["prefix"] + "-" + str(row["number"])
		},
		"values": values,
		"links": links,
		"linked_by": linked_by,
		"watching": watching
	}}

def action_object_update(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select * from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	now = mochi.time.now()

	# Update parent if provided
	parent = a.input("parent")
	if parent != None:
		old_parent = row["parent"]
		if parent != old_parent:
			mochi.db.execute("update objects set parent = ?, updated = ? where id = ?", parent, now, object_id)
			log_activity(object_id, a.user.identity.id, "moved", "parent", old_parent, parent)

	# Update type if provided
	new_type = a.input("type")
	if new_type and new_type != row["type"]:
		# Verify type exists
		type_row = mochi.db.row("select id from types where project = ? and id = ?", project_id, new_type)
		if type_row:
			mochi.db.execute("update objects set type = ?, updated = ? where id = ?", new_type, now, object_id)
			log_activity(object_id, a.user.identity.id, "updated", "type", row["type"], new_type)

	mochi.db.execute("update objects set updated = ? where id = ?", now, object_id)

	return {"data": {"success": True}}

def action_object_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Delete in order
	mochi.db.execute("delete from attachments where object = ?", object_id)
	mochi.db.execute("delete from watchers where object = ?", object_id)
	mochi.db.execute("delete from activity where object = ?", object_id)
	mochi.db.execute("delete from comments where object = ?", object_id)
	mochi.db.execute("delete from \"values\" where object = ?", object_id)
	mochi.db.execute("delete from links where source = ? or target = ?", object_id, object_id)
	mochi.db.execute("delete from objects where id = ?", object_id)

	return {"data": {"success": True}}

def action_object_move(a):
	"""Quick action to move object to a new status (for drag-drop)."""
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	status = a.input("status")
	if not status:
		a.error(400, "Status is required")
		return

	# Get old value
	old_row = mochi.db.row("select value from \"values\" where object = ? and field = ?", object_id, "status")
	old_value = old_row["value"] if old_row else ""

	if old_value != status:
		mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, "status", status)
		mochi.db.execute("update objects set updated = ? where id = ?", mochi.time.now(), object_id)
		log_activity(object_id, a.user.identity.id, "updated", "status", old_value, status)

	return {"data": {"success": True}}


# ============================================================================
# Value Actions
# ============================================================================

def action_values_set(a):
	"""Set multiple field values at once."""
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id, type from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Get valid fields for this type
	valid_fields = {}
	field_rows = mochi.db.rows("select id, name from fields where project = ? and type = ?", project_id, row["type"]) or []
	for f in field_rows:
		valid_fields[f["id"]] = f["name"]

	now = mochi.time.now()
	changes = []

	# Process each field from input
	for field_id in valid_fields:
		new_value = a.input(field_id)
		if new_value != None:
			# Get old value
			old_row = mochi.db.row("select value from \"values\" where object = ? and field = ?", object_id, field_id)
			old_value = old_row["value"] if old_row else ""

			if str(new_value) != old_value:
				mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field_id, str(new_value))
				log_activity(object_id, a.user.identity.id, "updated", field_id, old_value, str(new_value))
				changes.append(field_id)

	if changes:
		mochi.db.execute("update objects set updated = ? where id = ?", now, object_id)

	return {"data": {"success": True, "changed": changes}}

def action_value_set(a):
	"""Set a single field value."""
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	field_id = a.input("field")
	if not field_id:
		a.error(400, "Field ID required")
		return

	row = mochi.db.row("select id, type from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Verify field exists for this type
	field_row = mochi.db.row("select id from fields where project = ? and type = ? and id = ?", project_id, row["type"], field_id)
	if not field_row:
		a.error(400, "Invalid field for this type")
		return

	new_value = a.input("value")
	if new_value == None:
		new_value = ""

	# Get old value
	old_row = mochi.db.row("select value from \"values\" where object = ? and field = ?", object_id, field_id)
	old_value = old_row["value"] if old_row else ""

	if str(new_value) != old_value:
		mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field_id, str(new_value))
		mochi.db.execute("update objects set updated = ? where id = ?", mochi.time.now(), object_id)
		log_activity(object_id, a.user.identity.id, "updated", field_id, old_value, str(new_value))

	return {"data": {"success": True}}


# ============================================================================
# Link Actions
# ============================================================================

def action_link_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Get outgoing links
	outgoing = mochi.db.rows("""
		select l.target, l.linktype, l.created, o.number, o.type, v.value as title
		from links l
		join objects o on o.id = l.target
		left join "values" v on v.object = l.target and v.field = 'title'
		where l.source = ?
	""", object_id) or []

	# Get incoming links
	incoming = mochi.db.rows("""
		select l.source, l.linktype, l.created, o.number, o.type, v.value as title
		from links l
		join objects o on o.id = l.source
		left join "values" v on v.object = l.source and v.field = 'title'
		where l.target = ?
	""", object_id) or []

	return {"data": {"outgoing": outgoing, "incoming": incoming}}

def action_link_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	target_id = a.input("target")
	if not target_id:
		a.error(400, "Target object is required")
		return

	linktype = a.input("linktype")
	if not linktype:
		a.error(400, "Link type is required")
		return

	if linktype not in ["blocks", "blocked_by", "relates", "duplicates"]:
		a.error(400, "Invalid link type")
		return

	# Verify both objects exist in same project
	source_row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	target_row = mochi.db.row("select id from objects where id = ? and project = ?", target_id, project_id)

	if not source_row or not target_row:
		a.error(404, "Object not found")
		return

	if object_id == target_id:
		a.error(400, "Cannot link object to itself")
		return

	# Check if link already exists
	existing = mochi.db.exists("select 1 from links where source = ? and target = ? and linktype = ?", object_id, target_id, linktype)
	if existing:
		a.error(400, "Link already exists")
		return

	now = mochi.time.now()
	mochi.db.execute(
		"insert into links (project, source, target, linktype, created) values (?, ?, ?, ?, ?)",
		project_id, object_id, target_id, linktype, now
	)

	log_activity(object_id, a.user.identity.id, "linked", linktype, "", target_id)

	return {"data": {"success": True}}

def action_link_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	target_id = a.input("target")
	linktype = a.input("linktype")

	if not object_id or not target_id or not linktype:
		a.error(400, "Object, target, and linktype are required")
		return

	mochi.db.execute("delete from links where source = ? and target = ? and linktype = ?", object_id, target_id, linktype)

	return {"data": {"success": True}}


# ============================================================================
# Comment Actions
# ============================================================================

def action_comment_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	comments = mochi.db.rows(
		"select id, parent, author, name, content, created, edited from comments where object = ? order by created asc",
		object_id
	) or []

	return {"data": {"comments": comments}}

def action_comment_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	content = a.input("content")
	if not content or not content.strip():
		a.error(400, "Content is required")
		return

	parent = a.input("parent") or ""

	comment_id = mochi.id()
	now = mochi.time.now()

	mochi.db.execute(
		"insert into comments (id, object, parent, author, name, content, created, edited) values (?, ?, ?, ?, ?, ?, ?, ?)",
		comment_id, object_id, parent, a.user.identity.id, a.user.identity.name, content.strip(), now, 0
	)

	mochi.db.execute("update objects set updated = ? where id = ?", now, object_id)
	log_activity(object_id, a.user.identity.id, "commented")

	return {"data": {
		"id": comment_id,
		"author": a.user.identity.id,
		"name": a.user.identity.name,
		"content": content.strip(),
		"created": now
	}}

def action_comment_update(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	comment_id = a.input("comment")

	if not object_id or not comment_id:
		a.error(400, "Object and comment ID required")
		return

	comment = mochi.db.row("select * from comments where id = ? and object = ?", comment_id, object_id)
	if not comment:
		a.error(404, "Comment not found")
		return

	# Only author can edit
	if comment["author"] != a.user.identity.id:
		a.error(403, "Cannot edit another user's comment")
		return

	content = a.input("content")
	if not content or not content.strip():
		a.error(400, "Content is required")
		return

	now = mochi.time.now()
	mochi.db.execute("update comments set content = ?, edited = ? where id = ?", content.strip(), now, comment_id)

	return {"data": {"success": True}}

def action_comment_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	comment_id = a.input("comment")

	if not object_id or not comment_id:
		a.error(400, "Object and comment ID required")
		return

	comment = mochi.db.row("select * from comments where id = ? and object = ?", comment_id, object_id)
	if not comment:
		a.error(404, "Comment not found")
		return

	# Only author can delete
	if comment["author"] != a.user.identity.id:
		a.error(403, "Cannot delete another user's comment")
		return

	mochi.db.execute("delete from comments where id = ?", comment_id)

	return {"data": {"success": True}}


# ============================================================================
# Attachment Actions
# ============================================================================

def action_attachment_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	attachments = mochi.db.rows(
		"select id, name, size, mimetype, created from attachments where object = ? order by created desc",
		object_id
	) or []

	return {"data": {"attachments": attachments}}

def action_attachment_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Handle file upload using Mochi attachment system
	file = a.file("file")
	if not file:
		a.error(400, "File is required")
		return

	attachment_id = mochi.id()
	now = mochi.time.now()

	# Store file using Mochi attachment system
	mochi.attachment.save(object_id, attachment_id, file.name, file.data)

	# Record metadata
	mochi.db.execute(
		"insert into attachments (id, object, name, size, mimetype, created) values (?, ?, ?, ?, ?, ?)",
		attachment_id, object_id, file.name, len(file.data), file.mimetype or "", now
	)

	mochi.db.execute("update objects set updated = ? where id = ?", now, object_id)
	log_activity(object_id, a.user.identity.id, "attached", "", "", file.name)

	return {"data": {"id": attachment_id, "name": file.name, "size": len(file.data)}}

def action_attachment_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	object_id = a.input("object")
	attachment_id = a.input("attachment")

	if not object_id or not attachment_id:
		a.error(400, "Object and attachment ID required")
		return

	attachment = mochi.db.row("select * from attachments where id = ? and object = ?", attachment_id, object_id)
	if not attachment:
		a.error(404, "Attachment not found")
		return

	# Delete file
	mochi.attachment.delete(object_id, attachment_id)

	# Delete record
	mochi.db.execute("delete from attachments where id = ?", attachment_id)

	return {"data": {"success": True}}


# ============================================================================
# Activity Actions
# ============================================================================

def action_activity_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	activities = mochi.db.rows(
		"select id, actor, action, field, oldvalue, newvalue, created from activity where object = ? order by created desc",
		object_id
	) or []

	return {"data": {"activities": activities}}


# ============================================================================
# Watcher Actions
# ============================================================================

def action_watcher_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	watchers = mochi.db.rows("select user, created from watchers where object = ?", object_id) or []

	# Check if current user is watching
	watching = mochi.db.exists("select 1 from watchers where object = ? and user = ?", object_id, a.user.identity.id)

	return {"data": {"watchers": watchers, "watching": watching}}

def action_watcher_add(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Add current user as watcher
	now = mochi.time.now()
	mochi.db.execute(
		"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
		object_id, a.user.identity.id, now
	)

	return {"data": {"success": True, "watching": True}}

def action_watcher_remove(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Remove current user as watcher
	mochi.db.execute("delete from watchers where object = ? and user = ?", object_id, a.user.identity.id)

	return {"data": {"success": True, "watching": False}}


# ============================================================================
# View Actions
# ============================================================================

def action_view_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	views = mochi.db.rows(
		"select id, name, viewtype, filter, columns, rows, cardfields, sort, direction from views where project = ? order by name",
		project_id
	) or []

	return {"data": {"views": views}}

def action_view_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	name = a.input("name")
	if not name or not name.strip():
		a.error(400, "Name is required")
		return

	viewtype = a.input("viewtype") or "board"
	if viewtype not in ["board", "list"]:
		a.error(400, "Invalid view type")
		return

	# Generate view ID from name
	view_id = name.strip().lower().replace(" ", "_")

	# Check if ID already exists
	existing = mochi.db.exists("select 1 from views where project = ? and id = ?", project_id, view_id)
	if existing:
		a.error(400, "A view with this name already exists")
		return

	filter_str = a.input("filter") or ""
	columns = a.input("columns") or "status"
	rows = a.input("rows") or ""
	cardfields = a.input("cardfields") or "title,priority,assignee,due"
	sort = a.input("sort") or ""
	direction = a.input("direction") or "asc"

	mochi.db.execute(
		"insert into views (project, id, name, viewtype, filter, columns, rows, cardfields, sort, direction) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, view_id, name.strip(), viewtype, filter_str, columns, rows, cardfields, sort, direction
	)

	return {"data": {
		"id": view_id,
		"name": name.strip(),
		"viewtype": viewtype
	}}

def action_view_update(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	view_id = a.input("view")
	if not view_id:
		a.error(400, "View ID required")
		return

	view = mochi.db.row("select * from views where project = ? and id = ?", project_id, view_id)
	if not view:
		a.error(404, "View not found")
		return

	# Update fields if provided
	name = a.input("name")
	viewtype = a.input("viewtype")
	filter_str = a.input("filter")
	columns = a.input("columns")
	rows = a.input("rows")
	cardfields = a.input("cardfields")
	sort = a.input("sort")
	direction = a.input("direction")

	if name != None:
		mochi.db.execute("update views set name = ? where project = ? and id = ?", name.strip(), project_id, view_id)
	if viewtype != None:
		if viewtype not in ["board", "list"]:
			a.error(400, "Invalid view type")
			return
		mochi.db.execute("update views set viewtype = ? where project = ? and id = ?", viewtype, project_id, view_id)
	if filter_str != None:
		mochi.db.execute("update views set filter = ? where project = ? and id = ?", filter_str, project_id, view_id)
	if columns != None:
		mochi.db.execute("update views set columns = ? where project = ? and id = ?", columns, project_id, view_id)
	if rows != None:
		mochi.db.execute("update views set rows = ? where project = ? and id = ?", rows, project_id, view_id)
	if cardfields != None:
		mochi.db.execute("update views set cardfields = ? where project = ? and id = ?", cardfields, project_id, view_id)
	if sort != None:
		mochi.db.execute("update views set sort = ? where project = ? and id = ?", sort, project_id, view_id)
	if direction != None:
		if direction not in ["asc", "desc"]:
			a.error(400, "Invalid direction")
			return
		mochi.db.execute("update views set direction = ? where project = ? and id = ?", direction, project_id, view_id)

	return {"data": {"success": True}}

def action_view_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	view_id = a.input("view")
	if not view_id:
		a.error(400, "View ID required")
		return

	# Don't allow deleting the last view
	count = mochi.db.row("select count(*) as cnt from views where project = ?", project_id)
	if count and count["cnt"] <= 1:
		a.error(400, "Cannot delete the last view")
		return

	mochi.db.execute("delete from views where project = ? and id = ?", project_id, view_id)

	return {"data": {"success": True}}


# ============================================================================
# Type Actions
# ============================================================================

def action_type_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	types = mochi.db.rows("select id, name, sort from types where project = ? order by sort", project_id) or []

	return {"data": {"types": types}}

def action_type_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	name = a.input("name")
	if not name or not name.strip():
		a.error(400, "Name is required")
		return

	# Generate type ID from name
	type_id = name.strip().lower().replace(" ", "_")

	# Check if ID already exists
	existing = mochi.db.exists("select 1 from types where project = ? and id = ?", project_id, type_id)
	if existing:
		a.error(400, "A type with this name already exists")
		return

	# Get max sort order
	max_sort = mochi.db.row("select max(sort) as m from types where project = ?", project_id)
	sort = (max_sort["m"] or 0) + 1 if max_sort else 0

	mochi.db.execute(
		"insert into types (project, id, name, sort) values (?, ?, ?, ?)",
		project_id, type_id, name.strip(), sort
	)

	return {"data": {"id": type_id, "name": name.strip(), "sort": sort}}

def action_type_update(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	if not type_id:
		a.error(400, "Type ID required")
		return

	type_row = mochi.db.row("select * from types where project = ? and id = ?", project_id, type_id)
	if not type_row:
		a.error(404, "Type not found")
		return

	name = a.input("name")
	if name != None:
		mochi.db.execute("update types set name = ? where project = ? and id = ?", name.strip(), project_id, type_id)

	return {"data": {"success": True}}

def action_type_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	if not type_id:
		a.error(400, "Type ID required")
		return

	# Check if there are objects of this type
	has_objects = mochi.db.exists("select 1 from objects where project = ? and type = ?", project_id, type_id)
	if has_objects:
		a.error(400, "Cannot delete type with existing objects")
		return

	# Delete in order: options, fields, hierarchy, type
	mochi.db.execute("delete from options where project = ? and type = ?", project_id, type_id)
	mochi.db.execute("delete from fields where project = ? and type = ?", project_id, type_id)
	mochi.db.execute("delete from hierarchy where project = ? and type = ?", project_id, type_id)
	mochi.db.execute("delete from types where project = ? and id = ?", project_id, type_id)

	return {"data": {"success": True}}


# ============================================================================
# Hierarchy Actions
# ============================================================================

def action_hierarchy_get(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	type_id = a.input("type")
	if not type_id:
		a.error(400, "Type ID required")
		return

	parents = mochi.db.rows("select parent from hierarchy where project = ? and type = ?", project_id, type_id) or []
	parent_list = [p["parent"] for p in parents]

	return {"data": {"parents": parent_list}}

def action_hierarchy_set(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	if not type_id:
		a.error(400, "Type ID required")
		return

	type_row = mochi.db.row("select id from types where project = ? and id = ?", project_id, type_id)
	if not type_row:
		a.error(404, "Type not found")
		return

	# Get parents list (comma-separated or as JSON)
	parents_str = a.input("parents") or ""
	parents = [p.strip() for p in parents_str.split(",") if p.strip()] if parents_str else []

	# Delete existing hierarchy
	mochi.db.execute("delete from hierarchy where project = ? and type = ?", project_id, type_id)

	# Insert new hierarchy entries
	for parent in parents:
		# Verify parent type exists (unless it's empty string for root)
		if parent and parent != "":
			parent_exists = mochi.db.exists("select 1 from types where project = ? and id = ?", project_id, parent)
			if not parent_exists:
				continue  # Skip invalid parents
		mochi.db.execute(
			"insert into hierarchy (project, type, parent) values (?, ?, ?)",
			project_id, type_id, parent
		)

	return {"data": {"success": True}}


# ============================================================================
# Field Actions
# ============================================================================

def action_field_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	type_id = a.input("type")
	if not type_id:
		a.error(400, "Type ID required")
		return

	fields = mochi.db.rows(
		"select id, name, fieldtype, required, multi, sort, min, max, pattern, minlength, maxlength, prefix, suffix, format, card, position from fields where project = ? and type = ? order by sort",
		project_id, type_id
	) or []

	return {"data": {"fields": fields}}

def action_field_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	if not type_id:
		a.error(400, "Type ID required")
		return

	type_row = mochi.db.row("select id from types where project = ? and id = ?", project_id, type_id)
	if not type_row:
		a.error(404, "Type not found")
		return

	name = a.input("name")
	if not name or not name.strip():
		a.error(400, "Name is required")
		return

	fieldtype = a.input("fieldtype") or "text"
	if fieldtype not in ["text", "number", "date", "enum", "user", "object", "checkbox"]:
		a.error(400, "Invalid field type")
		return

	# Generate field ID from name
	field_id = name.strip().lower().replace(" ", "_")

	# Check if ID already exists
	existing = mochi.db.exists("select 1 from fields where project = ? and type = ? and id = ?", project_id, type_id, field_id)
	if existing:
		a.error(400, "A field with this name already exists")
		return

	# Get max sort order
	max_sort = mochi.db.row("select max(sort) as m from fields where project = ? and type = ?", project_id, type_id)
	sort = (max_sort["m"] or 0) + 1 if max_sort else 0

	required = 1 if a.input("required") == "1" or a.input("required") == "true" else 0
	multi = 1 if a.input("multi") == "1" or a.input("multi") == "true" else 0
	card = 1 if a.input("card") != "0" and a.input("card") != "false" else 0

	mochi.db.execute(
		"insert into fields (project, type, id, name, fieldtype, required, multi, sort, card) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, type_id, field_id, name.strip(), fieldtype, required, multi, sort, card
	)

	return {"data": {"id": field_id, "name": name.strip(), "fieldtype": fieldtype, "sort": sort}}

def action_field_update(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	field_id = a.input("field")
	if not type_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	field_row = mochi.db.row("select * from fields where project = ? and type = ? and id = ?", project_id, type_id, field_id)
	if not field_row:
		a.error(404, "Field not found")
		return

	# Update fields if provided
	name = a.input("name")
	required = a.input("required")
	multi = a.input("multi")
	card = a.input("card")
	min_val = a.input("min")
	max_val = a.input("max")
	pattern = a.input("pattern")
	minlength = a.input("minlength")
	maxlength = a.input("maxlength")
	prefix = a.input("prefix")
	suffix = a.input("suffix")
	format_str = a.input("format")
	position = a.input("position")

	if name != None:
		mochi.db.execute("update fields set name = ? where project = ? and type = ? and id = ?", name.strip(), project_id, type_id, field_id)
	if required != None:
		req_val = 1 if required == "1" or required == "true" else 0
		mochi.db.execute("update fields set required = ? where project = ? and type = ? and id = ?", req_val, project_id, type_id, field_id)
	if multi != None:
		multi_val = 1 if multi == "1" or multi == "true" else 0
		mochi.db.execute("update fields set multi = ? where project = ? and type = ? and id = ?", multi_val, project_id, type_id, field_id)
	if card != None:
		card_val = 1 if card == "1" or card == "true" else 0
		mochi.db.execute("update fields set card = ? where project = ? and type = ? and id = ?", card_val, project_id, type_id, field_id)
	if min_val != None:
		mochi.db.execute("update fields set min = ? where project = ? and type = ? and id = ?", min_val, project_id, type_id, field_id)
	if max_val != None:
		mochi.db.execute("update fields set max = ? where project = ? and type = ? and id = ?", max_val, project_id, type_id, field_id)
	if pattern != None:
		mochi.db.execute("update fields set pattern = ? where project = ? and type = ? and id = ?", pattern, project_id, type_id, field_id)
	if minlength != None:
		mochi.db.execute("update fields set minlength = ? where project = ? and type = ? and id = ?", int(minlength), project_id, type_id, field_id)
	if maxlength != None:
		mochi.db.execute("update fields set maxlength = ? where project = ? and type = ? and id = ?", int(maxlength), project_id, type_id, field_id)
	if prefix != None:
		mochi.db.execute("update fields set prefix = ? where project = ? and type = ? and id = ?", prefix, project_id, type_id, field_id)
	if suffix != None:
		mochi.db.execute("update fields set suffix = ? where project = ? and type = ? and id = ?", suffix, project_id, type_id, field_id)
	if format_str != None:
		mochi.db.execute("update fields set format = ? where project = ? and type = ? and id = ?", format_str, project_id, type_id, field_id)
	if position != None:
		mochi.db.execute("update fields set position = ? where project = ? and type = ? and id = ?", position, project_id, type_id, field_id)

	return {"data": {"success": True}}

def action_field_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	field_id = a.input("field")
	if not type_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	# Delete options for this field
	mochi.db.execute("delete from options where project = ? and type = ? and field = ?", project_id, type_id, field_id)

	# Delete field
	mochi.db.execute("delete from fields where project = ? and type = ? and id = ?", project_id, type_id, field_id)

	return {"data": {"success": True}}

def action_field_reorder(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	if not type_id:
		a.error(400, "Type ID required")
		return

	# Get order (comma-separated field IDs)
	order_str = a.input("order") or ""
	order = [f.strip() for f in order_str.split(",") if f.strip()]

	# Update sort order for each field
	for i, field_id in enumerate(order):
		mochi.db.execute(
			"update fields set sort = ? where project = ? and type = ? and id = ?",
			i, project_id, type_id, field_id
		)

	return {"data": {"success": True}}


# ============================================================================
# Option Actions
# ============================================================================

def action_option_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	type_id = a.input("type")
	field_id = a.input("field")
	if not type_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	options = mochi.db.rows(
		"select id, name, colour, icon, sort from options where project = ? and type = ? and field = ? order by sort",
		project_id, type_id, field_id
	) or []

	return {"data": {"options": options}}

def action_option_create(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	field_id = a.input("field")
	if not type_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	# Verify field exists and is enum type
	field_row = mochi.db.row("select fieldtype from fields where project = ? and type = ? and id = ?", project_id, type_id, field_id)
	if not field_row:
		a.error(404, "Field not found")
		return
	if field_row["fieldtype"] != "enum":
		a.error(400, "Options can only be added to enum fields")
		return

	name = a.input("name")
	if not name or not name.strip():
		a.error(400, "Name is required")
		return

	# Generate option ID from name
	option_id = name.strip().lower().replace(" ", "_")

	# Check if ID already exists
	existing = mochi.db.exists("select 1 from options where project = ? and type = ? and field = ? and id = ?", project_id, type_id, field_id, option_id)
	if existing:
		a.error(400, "An option with this name already exists")
		return

	# Get max sort order
	max_sort = mochi.db.row("select max(sort) as m from options where project = ? and type = ? and field = ?", project_id, type_id, field_id)
	sort = (max_sort["m"] or 0) + 1 if max_sort else 0

	colour = a.input("colour") or "#94a3b8"
	icon = a.input("icon") or ""

	mochi.db.execute(
		"insert into options (project, type, field, id, name, colour, icon, sort) values (?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, type_id, field_id, option_id, name.strip(), colour, icon, sort
	)

	return {"data": {"id": option_id, "name": name.strip(), "colour": colour, "sort": sort}}

def action_option_update(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	field_id = a.input("field")
	option_id = a.input("option")
	if not type_id or not field_id or not option_id:
		a.error(400, "Type, field, and option ID required")
		return

	option_row = mochi.db.row("select * from options where project = ? and type = ? and field = ? and id = ?", project_id, type_id, field_id, option_id)
	if not option_row:
		a.error(404, "Option not found")
		return

	name = a.input("name")
	colour = a.input("colour")
	icon = a.input("icon")

	if name != None:
		mochi.db.execute("update options set name = ? where project = ? and type = ? and field = ? and id = ?", name.strip(), project_id, type_id, field_id, option_id)
	if colour != None:
		mochi.db.execute("update options set colour = ? where project = ? and type = ? and field = ? and id = ?", colour, project_id, type_id, field_id, option_id)
	if icon != None:
		mochi.db.execute("update options set icon = ? where project = ? and type = ? and field = ? and id = ?", icon, project_id, type_id, field_id, option_id)

	return {"data": {"success": True}}

def action_option_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	field_id = a.input("field")
	option_id = a.input("option")
	if not type_id or not field_id or not option_id:
		a.error(400, "Type, field, and option ID required")
		return

	mochi.db.execute("delete from options where project = ? and type = ? and field = ? and id = ?", project_id, type_id, field_id, option_id)

	return {"data": {"success": True}}

def action_option_reorder(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] != 1:
		a.error(403, "Cannot modify remote project")
		return

	type_id = a.input("type")
	field_id = a.input("field")
	if not type_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	# Get order (comma-separated option IDs)
	order_str = a.input("order") or ""
	order = [o.strip() for o in order_str.split(",") if o.strip()]

	# Update sort order for each option
	for i, option_id in enumerate(order):
		mochi.db.execute(
			"update options set sort = ? where project = ? and type = ? and field = ? and id = ?",
			i, project_id, type_id, field_id, option_id
		)

	return {"data": {"success": True}}


# ============================================================================
# Repositories Service Actions (for Pull Request integration)
# ============================================================================

def action_repositories_list(a):
	"""List repositories the user has access to via the repositories service."""
	if not a.user:
		a.error(401, "Not logged in")
		return

	result = mochi.service.call("repositories", "list", {})
	if result == None:
		return {"data": {"repositories": []}}
	return {"data": {"repositories": result or []}}

def action_repositories_branches(a):
	"""Get branches for a repository via the repositories service."""
	if not a.user:
		a.error(401, "Not logged in")
		return

	repo_id = a.input("repo")
	if not repo_id:
		a.error(400, "Repository ID required")
		return

	result = mochi.service.call("repositories", "branches", {"repo": repo_id})
	if result == None:
		return {"data": {"branches": []}}
	return {"data": {"branches": result or []}}

def action_repositories_merge_check(a):
	"""Check if branches can be merged via the repositories service."""
	if not a.user:
		a.error(401, "Not logged in")
		return

	repo_id = a.input("repo")
	source = a.input("source")
	target = a.input("target")

	if not repo_id or not source or not target:
		a.error(400, "Repository, source branch, and target branch required")
		return

	result = mochi.service.call("repositories", "can_merge", {
		"repo": repo_id,
		"source": source,
		"target": target
	})

	if result == None:
		return {"data": {"mergeable": False, "error": "Could not check merge status"}}
	return {"data": result}

def action_repositories_diff(a):
	"""Get diff between branches via the repositories service."""
	if not a.user:
		a.error(401, "Not logged in")
		return

	repo_id = a.input("repo")
	base = a.input("base")
	head = a.input("head")

	if not repo_id or not base or not head:
		a.error(400, "Repository, base, and head required")
		return

	result = mochi.service.call("repositories", "diff", {
		"repo": repo_id,
		"base": base,
		"head": head
	})

	if result == None:
		return {"data": {"diff": None, "error": "Could not get diff"}}
	return {"data": result}

def action_repositories_merge(a):
	"""Perform merge via the repositories service."""
	if not a.user:
		a.error(401, "Not logged in")
		return

	repo_id = a.input("repo")
	source = a.input("source")
	target = a.input("target")
	message = a.input("message") or "Merge branch"

	if not repo_id or not source or not target:
		a.error(400, "Repository, source, and target required")
		return

	result = mochi.service.call("repositories", "merge", {
		"repo": repo_id,
		"source": source,
		"target": target,
		"message": message
	})

	if result == None:
		return {"data": {"success": False, "error": "Could not perform merge"}}
	return {"data": result}
