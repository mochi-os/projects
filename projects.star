# Mochi Projects app
# Copyright Alistair Cunningham 2026

# Helper to create P2P message headers
def p2p_headers(from_id, to_id, event):
	return {
		"from": from_id,
		"to": to_id,
		"service": "projects",
		"event": event
	}

# Broadcast an event to all subscribers of a project
def broadcast_event(project_id, event, data, exclude=None):
	subscribers = mochi.db.rows("select id from subscribers where project=?", project_id)
	for sub in subscribers:
		if exclude and sub["id"] == exclude:
			continue
		mochi.message.send(p2p_headers(project_id, sub["id"], event), data)

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
		rank integer not null default 0,
		created integer not null,
		updated integer not null,
		foreign key (project, type) references types(project, id)
	)""")
	mochi.db.execute("create index if not exists objects_project on objects(project)")
	mochi.db.execute("create index if not exists objects_type on objects(project, type)")
	mochi.db.execute("create index if not exists objects_parent on objects(parent)")
	mochi.db.execute("create index if not exists objects_rank on objects(rank)")
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
	mochi.db.execute("create index if not exists values_owner on \"values\"(value) where field='owner'")

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
	if to_version == 2:
		# Add rank column to objects for ordering within columns
		mochi.db.execute("alter table objects add column rank integer not null default 0")

	if to_version == 3:
		# Rename assignee field to owner
		mochi.db.execute("update fields set id='owner', name='Owner' where id='assignee'")
		mochi.db.execute("update \"values\" set field='owner' where field='assignee'")
		mochi.db.execute("update views set cardfields=replace(cardfields, 'assignee', 'owner')")
		# Add index for efficient owner lookups
		mochi.db.execute("create index if not exists values_owner on \"values\"(value) where field='owner'")


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
		("owner", "Owner", "user", 0, 4),
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
		project_id, "board", "Board", "board", "status", "title,priority,owner,due"
	)

	# Create default list view
	mochi.db.execute(
		"insert into views (project, id, name, viewtype, columns, cardfields, sort, direction) values (?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, "list", "List", "list", "", "title,status,priority,owner,due", "number", "desc"
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
		# Get owner name from first subscriber (the creator)
		subscriber = mochi.db.row("select name from subscribers where project=? order by subscribed asc limit 1", row["id"])
		ownername = subscriber["name"] if subscriber else ""
		projects.append({
			"id": row["id"],
			"fingerprint": mochi.entity.fingerprint(row["id"]),
			"name": row["name"],
			"description": row["description"],
			"prefix": row["prefix"],
			"owner": row["owner"],
			"ownername": ownername,
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

	broadcast_event(project_id, "project/update", {
		"project": project_id, "name": name or "", "description": description or "", "prefix": prefix or ""
	})

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
	# Notify subscribers that project is being deleted (before removing subscriber list)
	subscribers = mochi.db.rows("select id from subscribers where project=?", project_id)
	for sub in subscribers:
		mochi.message.send(p2p_headers(a.user.identity.id, sub["id"], "deleted"), {"project": project_id})

	mochi.db.execute("delete from subscribers where project = ?", project_id)
	mochi.db.execute("delete from projects where id = ?", project_id)

	# Delete entity
	mochi.entity.delete(project_id)

	return {"data": {"success": True}}


# List project members (subscribers + unique owners + current user)
def action_people_list(a):
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

	# Collect unique people with names
	people = {}

	# Always include current user first so they can assign to themselves
	people[a.user.identity.id] = {"id": a.user.identity.id, "name": a.user.identity.name}

	# Add subscribers (already have names stored)
	subscribers = mochi.db.rows("select id, name from subscribers where project=?", project_id) or []
	for sub in subscribers:
		if sub["id"] not in people:
			people[sub["id"]] = {"id": sub["id"], "name": sub["name"]}

	# Add unique owners from object values
	owners = mochi.db.rows(
		"select distinct value from \"values\" where field='owner' and value != '' and object in (select id from objects where project=?)",
		project_id
	) or []
	for owner in owners:
		owner_id = owner["value"]
		if owner_id and owner_id not in people:
			# Resolve owner name from entity
			name = mochi.entity.name(owner_id) or owner_id[:9]
			people[owner_id] = {"id": owner_id, "name": name}

	return {"data": {"people": list(people.values())}}


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
				"priority": "medium"
			}
		},
		"bug": {
			"id": "bug",
			"name": "Bug",
			"description": "Defect report.",
			"fields": {
				"status": "todo",
				"priority": "high"
			}
		},
		"feature": {
			"id": "feature",
			"name": "Feature",
			"description": "Feature request.",
			"fields": {
				"status": "todo"
			}
		},
		"pull_request": {
			"id": "pull_request",
			"name": "Pull request",
			"description": "Code review request linked to a repository.",
			"fields": {
				"status": "todo"
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
	activity_id = mochi.uid()
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
	query = "select o.id, o.project, o.type, o.number, o.parent, o.rank, o.created, o.updated from objects o where o.project = ?"
	params = [project_id]

	if type_filter:
		query += " and o.type = ?"
		params.append(type_filter)

	if parent_filter != None:
		query += " and o.parent = ?"
		params.append(parent_filter)

	query += " order by o.rank asc, o.created desc"

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
			"rank": row["rank"],
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

	# Determine the status for this object (from template or default)
	status = template.get("fields", {}).get("status", "")

	# Calculate initial rank (add to end of column)
	max_rank_row = mochi.db.row("""
		select coalesce(max(o.rank), 0) as max_rank
		from objects o
		left join "values" v on v.object = o.id and v.field = 'status'
		where o.project = ? and coalesce(v.value, '') = ?
	""", project_id, status)
	initial_rank = (max_rank_row["max_rank"] if max_rank_row else 0) + 1

	# Create object
	object_id = mochi.uid()
	now = mochi.time.now()

	mochi.db.execute(
		"insert into objects (id, project, type, number, parent, rank, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?)",
		object_id, project_id, obj_type, new_counter, parent, initial_rank, now, now
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

	# Collect all values for broadcast
	values = {}
	if title:
		values["title"] = title
	for field, value in template.get("fields", {}).items():
		if field != "title" or not title:
			values[field] = value

	# Broadcast to subscribers
	broadcast_event(project_id, "object/create", {
		"project": project_id, "id": object_id, "type": obj_type,
		"number": new_counter, "parent": parent, "values": values,
		"created": now
	})

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

	broadcast_event(project_id, "object/update", {
		"project": project_id, "id": object_id,
		"parent": parent if parent != None else row["parent"],
		"type": new_type if new_type and new_type != row["type"] else row["type"]
	})

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

	broadcast_event(project_id, "object/delete", {"project": project_id, "id": object_id})

	return {"data": {"success": True}}

def action_object_move(a):
	"""Quick action to move object to a new status and/or rank (for drag-drop)."""
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

	row = mochi.db.row("select id, rank from objects where id = ? and project = ?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	old_rank = row["rank"]
	status = a.input("status")
	new_rank = a.input("rank")

	# Get old status value
	old_status_row = mochi.db.row("select value from \"values\" where object = ? and field = ?", object_id, "status")
	old_status = old_status_row["value"] if old_status_row else ""

	# Determine target status (use provided or keep current)
	target_status = status if status else old_status
	status_changed = old_status != target_status

	# Handle status change
	if status_changed:
		mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, "status", target_status)
		log_activity(object_id, a.user.identity.id, "updated", "status", old_status, target_status)

	# Handle rank change
	if new_rank != None:
		new_rank = int(new_rank)
		# Shift other objects to make room
		if status_changed or new_rank != old_rank:
			# Get all objects in the target column
			objects_in_column = mochi.db.rows("""
				select o.id, o.rank from objects o
				left join "values" v on v.object = o.id and v.field = 'status'
				where o.project = ? and coalesce(v.value, '') = ? and o.id != ?
				order by o.rank asc
			""", project_id, target_status, object_id) or []

			# Renumber all objects, inserting this one at the new position
			rank = 1
			for obj in objects_in_column:
				if rank == new_rank:
					rank += 1  # Skip the position for our object
				mochi.db.execute("update objects set rank = ? where id = ?", rank, obj["id"])
				rank += 1

			# Set our object's rank
			mochi.db.execute("update objects set rank = ? where id = ?", new_rank, object_id)
	elif status_changed:
		# Moving to new column without specific rank - add to end
		max_rank_row = mochi.db.row("""
			select coalesce(max(o.rank), 0) as max_rank from objects o
			left join "values" v on v.object = o.id and v.field = 'status'
			where o.project = ? and coalesce(v.value, '') = ? and o.id != ?
		""", project_id, target_status, object_id)
		new_rank = (max_rank_row["max_rank"] if max_rank_row else 0) + 1
		mochi.db.execute("update objects set rank = ? where id = ?", new_rank, object_id)

	mochi.db.execute("update objects set updated = ? where id = ?", mochi.time.now(), object_id)

	if status_changed:
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id,
			"values": {"status": target_status}
		})

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
		# Collect changed values for broadcast
		changed_values = {}
		for fid in changes:
			val = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, fid)
			if val:
				changed_values[fid] = val["value"]
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id, "values": changed_values
		})

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
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id,
			"values": {field_id: str(new_value)}
		})

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

	broadcast_event(project_id, "link/create", {
		"project": project_id, "source": object_id,
		"target": target_id, "linktype": linktype, "created": now
	})

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

	broadcast_event(project_id, "link/delete", {
		"project": project_id, "source": object_id,
		"target": target_id, "linktype": linktype
	})

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

	comment_id = mochi.uid()
	now = mochi.time.now()

	mochi.db.execute(
		"insert into comments (id, object, parent, author, name, content, created, edited) values (?, ?, ?, ?, ?, ?, ?, ?)",
		comment_id, object_id, parent, a.user.identity.id, a.user.identity.name, content.strip(), now, 0
	)

	mochi.db.execute("update objects set updated = ? where id = ?", now, object_id)
	log_activity(object_id, a.user.identity.id, "commented")

	broadcast_event(project_id, "comment/create", {
		"project": project_id, "object": object_id,
		"id": comment_id, "parent": parent,
		"author": a.user.identity.id, "name": a.user.identity.name,
		"content": content.strip(), "created": now
	})

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

	broadcast_event(project_id, "comment/update", {
		"project": project_id, "object": object_id,
		"id": comment_id, "content": content.strip(), "edited": now
	})

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

	broadcast_event(project_id, "comment/delete", {
		"project": project_id, "object": object_id, "id": comment_id
	})

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

	attachment_id = mochi.uid()
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

	rows = mochi.db.rows(
		"select id, actor, action, field, oldvalue, newvalue, created from activity where object = ? order by created desc",
		object_id
	) or []

	# Resolve actor names
	activities = []
	for row in rows:
		actor = row["actor"]
		name = mochi.entity.name(actor) or actor[:9]
		activities.append({
			"id": row["id"],
			"actor": actor,
			"name": name,
			"action": row["action"],
			"field": row["field"],
			"oldvalue": row["oldvalue"],
			"newvalue": row["newvalue"],
			"created": row["created"],
		})

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
	cardfields = a.input("cardfields") or "title,priority,owner,due"
	sort = a.input("sort") or ""
	direction = a.input("direction") or "asc"

	mochi.db.execute(
		"insert into views (project, id, name, viewtype, filter, columns, rows, cardfields, sort, direction) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, view_id, name.strip(), viewtype, filter_str, columns, rows, cardfields, sort, direction
	)

	broadcast_event(project_id, "view/create", {
		"project": project_id, "id": view_id, "name": name.strip(),
		"viewtype": viewtype, "filter": filter_str, "columns": columns,
		"rows": rows, "cardfields": cardfields, "sort": sort, "direction": direction
	})

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

	# Read back updated view for broadcast
	updated = mochi.db.row("select * from views where project=? and id=?", project_id, view_id)
	if updated:
		broadcast_event(project_id, "view/update", {
			"project": project_id, "id": view_id,
			"name": updated["name"], "viewtype": updated["viewtype"],
			"filter": updated["filter"], "columns": updated["columns"],
			"rows": updated["rows"], "cardfields": updated["cardfields"],
			"sort": updated["sort"], "direction": updated["direction"]
		})

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

	broadcast_event(project_id, "view/delete", {"project": project_id, "id": view_id})

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

	broadcast_event(project_id, "type/create", {
		"project": project_id, "id": type_id, "name": name.strip(), "sort": sort
	})

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

	broadcast_event(project_id, "type/update", {
		"project": project_id, "id": type_id, "name": name or type_row["name"]
	})

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

	broadcast_event(project_id, "type/delete", {"project": project_id, "id": type_id})

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

	broadcast_event(project_id, "hierarchy/set", {
		"project": project_id, "type": type_id, "parents": parents
	})

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

	broadcast_event(project_id, "field/create", {
		"project": project_id, "type": type_id, "id": field_id,
		"name": name.strip(), "fieldtype": fieldtype, "required": required,
		"multi": multi, "sort": sort, "card": card
	})

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

	# Build update data from provided fields
	update_data = {"project": project_id, "type": type_id, "id": field_id}
	if name != None:
		update_data["name"] = name.strip()
	if required != None:
		update_data["required"] = 1 if required == "1" or required == "true" else 0
	if multi != None:
		update_data["multi"] = 1 if multi == "1" or multi == "true" else 0
	if card != None:
		update_data["card"] = 1 if card == "1" or card == "true" else 0
	if min_val != None:
		update_data["min"] = min_val
	if max_val != None:
		update_data["max"] = max_val
	if pattern != None:
		update_data["pattern"] = pattern
	if minlength != None:
		update_data["minlength"] = int(minlength)
	if maxlength != None:
		update_data["maxlength"] = int(maxlength)
	if prefix != None:
		update_data["prefix"] = prefix
	if suffix != None:
		update_data["suffix"] = suffix
	if format_str != None:
		update_data["format"] = format_str
	if position != None:
		update_data["position"] = position
	broadcast_event(project_id, "field/update", update_data)

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

	broadcast_event(project_id, "field/delete", {"project": project_id, "type": type_id, "id": field_id})

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

	broadcast_event(project_id, "field/reorder", {"project": project_id, "type": type_id, "order": order})

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

	broadcast_event(project_id, "option/create", {
		"project": project_id, "type": type_id, "field": field_id,
		"id": option_id, "name": name.strip(), "colour": colour, "icon": icon, "sort": sort
	})

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

	update_data = {"project": project_id, "type": type_id, "field": field_id, "id": option_id}
	if name != None:
		update_data["name"] = name.strip()
	if colour != None:
		update_data["colour"] = colour
	if icon != None:
		update_data["icon"] = icon
	broadcast_event(project_id, "option/update", update_data)

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

	broadcast_event(project_id, "option/delete", {"project": project_id, "type": type_id, "field": field_id, "id": option_id})

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

	broadcast_event(project_id, "option/reorder", {"project": project_id, "type": type_id, "field": field_id, "order": order})

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

# Search for projects in the directory
def action_search(a):
	if not a.user.identity.id:
		a.error(401, "Not logged in")
		return

	search = a.input("search")
	if not search:
		a.error(400, "No search entered")
		return

	results = []

	# Check if search term is an entity ID (49-51 word characters)
	if mochi.valid(search, "entity"):
		entry = mochi.directory.get(search)
		if entry and entry.get("class") == "project":
			results.append(entry)

	# Check if search term is a fingerprint (9 alphanumeric, with or without hyphens)
	fingerprint = search.replace("-", "")
	if mochi.valid(fingerprint, "fingerprint"):
		# Search directory by fingerprint
		all_projects = mochi.directory.search("project", "", False)
		for entry in all_projects:
			entry_fp = entry.get("fingerprint", "").replace("-", "")
			if entry_fp == fingerprint:
				# Avoid duplicates if already found by ID
				found = False
				for r in results:
					if r.get("id") == entry.get("id"):
						found = True
						break
				if not found:
					results.append(entry)
				break

	# Check if search term is a URL (e.g., https://example.com/projects/ENTITY_ID)
	if search.startswith("http://") or search.startswith("https://"):
		url = search
		if "/projects/" in url:
			parts = url.split("/projects/", 1)
			project_path = parts[1]
			# Handle query parameter format: ?project=ENTITY_ID
			if project_path.startswith("?project="):
				project_id = project_path[9:]
				if "&" in project_id:
					project_id = project_id.split("&")[0]
				if "#" in project_id:
					project_id = project_id.split("#")[0]
			else:
				# Path format: /projects/ENTITY_ID or /projects/ENTITY_ID/...
				project_id = project_path.split("/")[0] if "/" in project_path else project_path
				if "?" in project_id:
					project_id = project_id.split("?")[0]
				if "#" in project_id:
					project_id = project_id.split("#")[0]

			if mochi.valid(project_id, "entity"):
				entry = mochi.directory.get(project_id)
				if entry and entry.get("class") == "project":
					# Avoid duplicates
					found = False
					for r in results:
						if r.get("id") == entry.get("id"):
							found = True
							break
					if not found:
						results.append(entry)
			# Try as fingerprint
			elif mochi.valid(project_id, "fingerprint"):
				all_projects = mochi.directory.search("project", "", False)
				for entry in all_projects:
					entry_fp = entry.get("fingerprint", "").replace("-", "")
					if entry_fp == project_id.replace("-", ""):
						found = False
						for r in results:
							if r.get("id") == entry.get("id"):
								found = True
								break
						if not found:
							results.append(entry)
						break

	# Also search by name
	name_results = mochi.directory.search("project", search, False)
	for entry in name_results:
		# Avoid duplicates
		found = False
		for r in results:
			if r.get("id") == entry.get("id"):
				found = True
				break
		if not found:
			results.append(entry)

	return {"data": results}


# ============================================================================
# Remote Projects (Subscribe/Bookmark)
# ============================================================================

# Probe a remote project by URL without subscribing
def action_probe(a):
	if not a.user.identity.id:
		a.error(401, "Not logged in")
		return

	url = a.input("url")
	if not url:
		a.error(400, "No URL provided")
		return

	# Parse URL to extract server and project ID
	# Expected formats:
	#   https://example.com/projects/ENTITY_ID
	#   http://example.com/projects/ENTITY_ID
	#   example.com/projects/ENTITY_ID
	server = ""
	project_id = ""
	protocol = "https://"

	# Extract and preserve protocol prefix
	if url.startswith("https://"):
		protocol = "https://"
		url = url[8:]
	elif url.startswith("http://"):
		protocol = "http://"
		url = url[7:]

	# Split by /projects/ to get server and project ID
	if "/projects/" in url:
		parts = url.split("/projects/", 1)
		server = protocol + parts[0]
		# Project ID is everything after /projects/ up to next / or end
		project_path = parts[1]
		if "/" in project_path:
			project_id = project_path.split("/")[0]
		else:
			project_id = project_path
	else:
		a.error(400, "Invalid URL format. Expected: https://server/projects/PROJECT_ID")
		return

	if not server or server == protocol:
		a.error(400, "Could not extract server from URL")
		return

	if not project_id or not mochi.valid(project_id, "entity"):
		a.error(400, "Could not extract valid project ID from URL")
		return

	peer = mochi.remote.peer(server)
	if not peer:
		a.error(502, "Unable to connect to server")
		return
	response = mochi.remote.request(project_id, "projects", "info", {"project": project_id}, peer)
	if response.get("error"):
		a.error(response.get("code", 404), response["error"])
		return

	# Return project info as a directory-like entry
	return {"data": {
		"id": project_id,
		"name": response.get("name", ""),
		"description": response.get("description", ""),
		"prefix": response.get("prefix", "PROJ"),
		"fingerprint": response.get("fingerprint", ""),
		"class": "project",
		"server": server,
		"remote": True
	}}

# Subscribe to a remote project
def action_subscribe(a):
	if not a.user.identity.id:
		a.error(401, "Not logged in")
		return
	user_id = a.user.identity.id

	project_id = a.input("project")
	server = a.input("server")
	if not mochi.valid(project_id, "entity"):
		a.error(400, "Invalid project ID")
		return

	# Check if already subscribed
	existing = mochi.db.row("select id, owner from projects where id=?", project_id)
	if existing:
		if existing["owner"] == 1:
			a.error(400, "You own this project")
			return
		# Already subscribed, just return success
		return {"data": {"fingerprint": mochi.entity.fingerprint(project_id)}}

	# Get project info from remote or directory
	if server:
		peer = mochi.remote.peer(server)
		if not peer:
			a.error(502, "Unable to connect to server")
			return
		response = mochi.remote.request(project_id, "projects", "info", {"project": project_id}, peer)
		if response.get("error"):
			a.error(response.get("code", 404), response["error"])
			return
		project_name = response.get("name", "")
		project_desc = response.get("description", "")
		project_prefix = response.get("prefix", "PROJ")
	else:
		# Use directory lookup when no server specified
		directory = mochi.directory.get(project_id)
		if directory == None or len(directory) == 0:
			a.error(404, "Unable to find project in directory")
			return
		project_name = directory.get("name", "")
		project_desc = ""
		project_prefix = "PROJ"

	now = mochi.time.now()
	fp = mochi.entity.fingerprint(project_id) or ""

	# Insert the remote project
	mochi.db.execute(
		"insert into projects (id, name, description, prefix, counter, owner, server, created, updated) values (?, ?, ?, ?, 0, 0, ?, ?, ?)",
		project_id, project_name, project_desc, project_prefix, server or "", now, now
	)

	# Send P2P subscribe message to project owner
	mochi.message.send(p2p_headers(user_id, project_id, "subscribe"), {"name": a.user.identity.name})

	return {"data": {"fingerprint": fp}}

# Unsubscribe from a remote project
def action_unsubscribe(a):
	if not a.user.identity.id:
		a.error(401, "Not logged in")
		return
	user_id = a.user.identity.id

	project_id = a.input("project")
	if not mochi.valid(project_id, "entity") and not mochi.valid(project_id, "fingerprint"):
		a.error(400, "Invalid project ID")
		return

	# Look up by ID or fingerprint
	project = mochi.db.row("select * from projects where id=?", project_id)
	if not project:
		# Try fingerprint lookup
		projects = mochi.db.rows("select * from projects where owner=0")
		for p in projects:
			fp = mochi.entity.fingerprint(p["id"]) or ""
			if fp.replace("-", "") == project_id.replace("-", ""):
				project = p
				project_id = p["id"]
				break

	if not project:
		a.error(404, "Project not found")
		return

	if project["owner"] == 1:
		a.error(400, "You own this project")
		return

	# Delete all local data for this remote project
	objects = mochi.db.rows("select id from objects where project=?", project_id)
	for obj in objects:
		mochi.db.execute("delete from watchers where object=?", obj["id"])
		mochi.db.execute("delete from activity where object=?", obj["id"])
		mochi.db.execute("delete from comments where object=?", obj["id"])
		mochi.db.execute("delete from \"values\" where object=?", obj["id"])
		mochi.db.execute("delete from links where source=? or target=?", obj["id"], obj["id"])

	mochi.db.execute("delete from objects where project=?", project_id)
	mochi.db.execute("delete from options where project=?", project_id)
	mochi.db.execute("delete from fields where project=?", project_id)
	mochi.db.execute("delete from hierarchy where project=?", project_id)
	mochi.db.execute("delete from types where project=?", project_id)
	mochi.db.execute("delete from views where project=?", project_id)
	mochi.db.execute("delete from subscribers where project=?", project_id)
	mochi.db.execute("delete from projects where id=?", project_id)

	# Send P2P unsubscribe message
	mochi.message.send(p2p_headers(user_id, project_id, "unsubscribe"), {})

	return {"data": {"success": True}}


# ============================================================================
# P2P Events
# ============================================================================

# Handle project info request from a remote server
def event_info(e):
	project_id = e.header("to")

	entity = mochi.entity.info(project_id)
	if not entity or entity.get("class") != "project":
		e.stream.write({"error": "Project not found"})
		return

	project = mochi.db.row("select * from projects where id=?", project_id)
	if not project:
		e.stream.write({"error": "Project not found"})
		return

	e.stream.write({
		"id": entity["id"],
		"name": project["name"],
		"description": project["description"],
		"prefix": project["prefix"],
		"fingerprint": entity.get("fingerprint", mochi.entity.fingerprint(project_id)),
	})

# Send all existing project data to a new subscriber
def send_project_data(project_id, subscriber_id):
	h = p2p_headers(project_id, subscriber_id, "")

	# Send types
	types = mochi.db.rows("select * from types where project=?", project_id)
	for t in types:
		h["event"] = "type/create"
		mochi.message.send(h, {"project": project_id, "id": t["id"], "name": t["name"], "icon": t["icon"], "colour": t["colour"], "prefix": t["prefix"], "created": t["created"]})

		# Send hierarchy for this type
		children = mochi.db.rows("select child from hierarchy where project=? and type=? order by sort", project_id, t["id"])
		if children:
			h["event"] = "hierarchy/set"
			mochi.message.send(h, {"project": project_id, "type": t["id"], "children": [c["child"] for c in children]})

		# Send fields for this type
		fields = mochi.db.rows("select * from fields where project=? and type=? order by sort", project_id, t["id"])
		for f in fields:
			h["event"] = "field/create"
			mochi.message.send(h, {
				"project": project_id, "type": t["id"], "id": f["id"], "name": f["name"],
				"fieldtype": f["fieldtype"], "required": f["required"], "multi": f["multi"],
				"sort": f["sort"], "card": f["card"]
			})

			# Send options for enum fields
			options = mochi.db.rows("select * from options where project=? and type=? and field=? order by sort", project_id, t["id"], f["id"])
			for o in options:
				h["event"] = "option/create"
				mochi.message.send(h, {
					"project": project_id, "type": t["id"], "field": f["id"],
					"id": o["id"], "name": o["name"], "colour": o["colour"], "icon": o["icon"], "sort": o["sort"]
				})

	# Send views
	views = mochi.db.rows("select * from views where project=?", project_id)
	for v in views:
		h["event"] = "view/create"
		mochi.message.send(h, {
			"project": project_id, "id": v["id"], "name": v["name"], "type": v["type"],
			"layout": v["layout"], "filters": v["filters"], "sort": v["sort"],
			"groups": v["groups"], "columns": v["columns"], "created": v["created"]
		})

	# Send objects with their values, comments, and links
	objects = mochi.db.rows("select * from objects where project=?", project_id)
	for obj in objects:
		h["event"] = "object/create"
		mochi.message.send(h, {
			"project": project_id, "id": obj["id"], "type": obj["type"], "name": obj["name"],
			"number": obj["number"], "parent": obj["parent"], "created": obj["created"], "updated": obj["updated"]
		})

		# Send values for this object
		vals = mochi.db.rows("select field, value from \"values\" where object=?", obj["id"])
		if vals:
			values_map = {}
			for v in vals:
				values_map[v["field"]] = v["value"]
			h["event"] = "values/update"
			mochi.message.send(h, {"project": project_id, "id": obj["id"], "values": values_map})

		# Send comments for this object
		comments = mochi.db.rows("select * from comments where object=? order by created", obj["id"])
		for c in comments:
			h["event"] = "comment/create"
			mochi.message.send(h, {
				"project": project_id, "id": c["id"], "object": obj["id"],
				"author": c["author"], "content": c["content"], "created": c["created"]
			})

	# Send links (once, not per-object)
	links = mochi.db.rows("select l.source, l.target, l.type from links l join objects o on l.source = o.id where o.project=?", project_id)
	for l in links:
		h["event"] = "link/create"
		mochi.message.send(h, {"project": project_id, "source": l["source"], "target": l["target"], "type": l["type"]})

# Handle subscribe event from a remote user
def event_subscribe(e):
	project_id = e.header("to")

	project = mochi.db.row("select * from projects where id=? and owner=1", project_id)
	if not project:
		return

	subscriber_id = e.header("from")
	if not mochi.valid(subscriber_id, "entity"):
		return

	name = e.content("name")
	if not mochi.valid(name, "line"):
		return

	now = mochi.time.now()
	mochi.db.execute(
		"insert or ignore into subscribers (project, id, name, subscribed) values (?, ?, ?, ?)",
		project_id, subscriber_id, name, now
	)

	# Update project timestamp
	mochi.db.execute("update projects set updated=? where id=?", now, project_id)

	# Send websocket notification for real-time UI updates
	fingerprint = mochi.entity.fingerprint(project_id)
	if fingerprint:
		mochi.websocket.write(fingerprint, {"type": "project/update", "project": project_id})

	# Sync all existing project data to the new subscriber
	send_project_data(project_id, subscriber_id)

# Handle unsubscribe event from a remote user
def event_unsubscribe(e):
	project_id = e.header("to")

	project = mochi.db.row("select * from projects where id=? and owner=1", project_id)
	if not project:
		return

	subscriber_id = e.header("from")

	# Clean up watchers created by this subscriber
	mochi.db.execute("delete from watchers where user=?", subscriber_id)

	# Clean up activity records by this subscriber
	mochi.db.execute("delete from activity where user=?", subscriber_id)

	# Remove subscriber
	mochi.db.execute("delete from subscribers where project=? and id=?", project_id, subscriber_id)

	# Update project timestamp
	mochi.db.execute("update projects set updated=? where id=?", mochi.time.now(), project_id)

	# Send websocket notification
	fingerprint = mochi.entity.fingerprint(project_id)
	if fingerprint:
		mochi.websocket.write(fingerprint, {"type": "project/update", "project": project_id})

# Handle notification that a project has been deleted by its owner
def event_deleted(e):
	project_id = e.content("project")
	if not project_id:
		project_id = e.header("from")

	# Only delete if we don't own this project
	project = mochi.db.row("select * from projects where id=? and owner=0", project_id)
	if not project:
		return

	# Delete all local data for this remote project
	objects = mochi.db.rows("select id from objects where project=?", project_id)
	for obj in objects:
		mochi.db.execute("delete from watchers where object=?", obj["id"])
		mochi.db.execute("delete from activity where object=?", obj["id"])
		mochi.db.execute("delete from comments where object=?", obj["id"])
		mochi.db.execute("delete from \"values\" where object=?", obj["id"])
		mochi.db.execute("delete from links where source=? or target=?", obj["id"], obj["id"])

	mochi.db.execute("delete from objects where project=?", project_id)
	mochi.db.execute("delete from options where project=?", project_id)
	mochi.db.execute("delete from fields where project=?", project_id)
	mochi.db.execute("delete from hierarchy where project=?", project_id)
	mochi.db.execute("delete from types where project=?", project_id)
	mochi.db.execute("delete from views where project=?", project_id)
	mochi.db.execute("delete from subscribers where project=?", project_id)
	mochi.db.execute("delete from projects where id=?", project_id)


# ============================================================================
# Content Sync Event Handlers (received by subscribers)
# ============================================================================

# Helper to verify a content event is for a project we subscribe to
def verify_subscription(e):
	project_id = e.content("project")
	if not project_id:
		return None
	project = mochi.db.row("select id from projects where id=? and owner=0", project_id)
	if not project:
		return None
	return project_id

# Project updated
def event_project_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	name = e.content("name")
	description = e.content("description")
	prefix = e.content("prefix")
	if name != None:
		mochi.db.execute("update projects set name=? where id=?", name, project_id)
	if description != None:
		mochi.db.execute("update projects set description=? where id=?", description, project_id)
	if prefix != None:
		mochi.db.execute("update projects set prefix=? where id=?", prefix, project_id)
	mochi.db.execute("update projects set updated=? where id=?", mochi.time.now(), project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "project/update", "project": project_id})

# Object created
def event_object_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into objects (id, project, type, name, number, parent, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?)",
		e.content("id"), project_id, e.content("type") or "", e.content("name") or "",
		e.content("number") or 0, e.content("parent") or "", e.content("created") or mochi.time.now(),
		e.content("updated") or mochi.time.now()
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "object/create", "project": project_id, "id": e.content("id")})

# Object updated
def event_object_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	object_id = e.content("id")
	if not object_id:
		return
	name = e.content("name")
	type_id = e.content("type")
	parent = e.content("parent")
	if name != None:
		mochi.db.execute("update objects set name=? where id=? and project=?", name, object_id, project_id)
	if type_id != None:
		mochi.db.execute("update objects set type=? where id=? and project=?", type_id, object_id, project_id)
	if parent != None:
		mochi.db.execute("update objects set parent=? where id=? and project=?", parent, object_id, project_id)
	mochi.db.execute("update objects set updated=? where id=? and project=?", mochi.time.now(), object_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "object/update", "project": project_id, "id": object_id})

# Object deleted
def event_object_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	object_id = e.content("id")
	if not object_id:
		return
	mochi.db.execute("delete from watchers where object=?", object_id)
	mochi.db.execute("delete from activity where object=?", object_id)
	mochi.db.execute("delete from comments where object=?", object_id)
	mochi.db.execute("delete from \"values\" where object=?", object_id)
	mochi.db.execute("delete from links where source=? or target=?", object_id, object_id)
	mochi.db.execute("delete from objects where id=? and project=?", object_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "object/delete", "project": project_id, "id": object_id})

# Values updated
def event_values_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	object_id = e.content("id")
	if not object_id:
		return
	values = e.content("values")
	if not values:
		return
	for field in values:
		mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field, values[field])
	mochi.db.execute("update objects set updated=? where id=? and project=?", mochi.time.now(), object_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "values/update", "project": project_id, "id": object_id})

# Comment created
def event_comment_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into comments (id, object, author, content, created, updated) values (?, ?, ?, ?, ?, ?)",
		e.content("id"), e.content("object") or "", e.content("author") or "",
		e.content("content") or "", e.content("created") or mochi.time.now(),
		e.content("created") or mochi.time.now()
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "comment/create", "project": project_id, "object": e.content("object")})

# Comment updated
def event_comment_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	comment_id = e.content("id")
	if not comment_id:
		return
	content = e.content("content")
	if content != None:
		mochi.db.execute("update comments set content=?, updated=? where id=?", content, mochi.time.now(), comment_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "comment/update", "project": project_id, "id": comment_id})

# Comment deleted
def event_comment_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	comment_id = e.content("id")
	if not comment_id:
		return
	mochi.db.execute("delete from comments where id=?", comment_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "comment/delete", "project": project_id, "id": comment_id})

# Link created
def event_link_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into links (source, target, type) values (?, ?, ?)",
		e.content("source") or "", e.content("target") or "", e.content("type") or "related"
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "link/create", "project": project_id})

# Link deleted
def event_link_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"delete from links where source=? and target=? and type=?",
		e.content("source") or "", e.content("target") or "", e.content("type") or "related"
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "link/delete", "project": project_id})

# View created
def event_view_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into views (id, project, name, type, layout, filters, sort, groups, columns, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		e.content("id"), project_id, e.content("name") or "", e.content("type") or "",
		e.content("layout") or "list", e.content("filters") or "[]", e.content("sort") or "[]",
		e.content("groups") or "[]", e.content("columns") or "[]",
		e.content("created") or mochi.time.now(), e.content("created") or mochi.time.now()
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "view/create", "project": project_id, "id": e.content("id")})

# View updated
def event_view_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	view_id = e.content("id")
	if not view_id:
		return
	name = e.content("name")
	layout = e.content("layout")
	filters = e.content("filters")
	sort = e.content("sort")
	groups = e.content("groups")
	columns = e.content("columns")
	if name != None:
		mochi.db.execute("update views set name=? where id=? and project=?", name, view_id, project_id)
	if layout != None:
		mochi.db.execute("update views set layout=? where id=? and project=?", layout, view_id, project_id)
	if filters != None:
		mochi.db.execute("update views set filters=? where id=? and project=?", filters, view_id, project_id)
	if sort != None:
		mochi.db.execute("update views set sort=? where id=? and project=?", sort, view_id, project_id)
	if groups != None:
		mochi.db.execute("update views set groups=? where id=? and project=?", groups, view_id, project_id)
	if columns != None:
		mochi.db.execute("update views set columns=? where id=? and project=?", columns, view_id, project_id)
	mochi.db.execute("update views set updated=? where id=? and project=?", mochi.time.now(), view_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "view/update", "project": project_id, "id": view_id})

# View deleted
def event_view_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	view_id = e.content("id")
	if not view_id:
		return
	mochi.db.execute("delete from views where id=? and project=?", view_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "view/delete", "project": project_id, "id": view_id})

# Type created
def event_type_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into types (id, project, name, icon, colour, prefix, created) values (?, ?, ?, ?, ?, ?, ?)",
		e.content("id"), project_id, e.content("name") or "", e.content("icon") or "",
		e.content("colour") or "", e.content("prefix") or "", e.content("created") or mochi.time.now()
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "type/create", "project": project_id, "id": e.content("id")})

# Type updated
def event_type_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("id")
	if not type_id:
		return
	name = e.content("name")
	icon = e.content("icon")
	colour = e.content("colour")
	prefix = e.content("prefix")
	if name != None:
		mochi.db.execute("update types set name=? where id=? and project=?", name, type_id, project_id)
	if icon != None:
		mochi.db.execute("update types set icon=? where id=? and project=?", icon, type_id, project_id)
	if colour != None:
		mochi.db.execute("update types set colour=? where id=? and project=?", colour, type_id, project_id)
	if prefix != None:
		mochi.db.execute("update types set prefix=? where id=? and project=?", prefix, type_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "type/update", "project": project_id, "id": type_id})

# Type deleted
def event_type_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("id")
	if not type_id:
		return
	mochi.db.execute("delete from options where project=? and type=?", project_id, type_id)
	mochi.db.execute("delete from fields where project=? and type=?", project_id, type_id)
	mochi.db.execute("delete from hierarchy where project=? and type=?", project_id, type_id)
	mochi.db.execute("delete from types where id=? and project=?", type_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "type/delete", "project": project_id, "id": type_id})

# Hierarchy set
def event_hierarchy_set(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("type")
	children = e.content("children")
	if not type_id:
		return
	# Clear existing hierarchy for this type
	mochi.db.execute("delete from hierarchy where project=? and type=?", project_id, type_id)
	# Insert new children
	if children:
		for i, child in enumerate(children):
			mochi.db.execute(
				"insert into hierarchy (project, type, child, sort) values (?, ?, ?, ?)",
				project_id, type_id, child, i
			)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "hierarchy/set", "project": project_id, "type_id": type_id})

# Field created
def event_field_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into fields (project, type, id, name, fieldtype, required, multi, sort, card) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, e.content("type") or "", e.content("id") or "", e.content("name") or "",
		e.content("fieldtype") or "text", e.content("required") or 0, e.content("multi") or 0,
		e.content("sort") or 0, e.content("card") or 1
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "field/create", "project": project_id, "type_id": e.content("type"), "id": e.content("id")})

# Field updated
def event_field_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("type")
	field_id = e.content("id")
	if not type_id or not field_id:
		return
	name = e.content("name")
	required = e.content("required")
	multi = e.content("multi")
	card = e.content("card")
	min_val = e.content("min")
	max_val = e.content("max")
	pattern = e.content("pattern")
	minlength = e.content("minlength")
	maxlength = e.content("maxlength")
	prefix = e.content("prefix")
	suffix = e.content("suffix")
	format_str = e.content("format")
	position = e.content("position")
	if name != None:
		mochi.db.execute("update fields set name=? where project=? and type=? and id=?", name, project_id, type_id, field_id)
	if required != None:
		mochi.db.execute("update fields set required=? where project=? and type=? and id=?", required, project_id, type_id, field_id)
	if multi != None:
		mochi.db.execute("update fields set multi=? where project=? and type=? and id=?", multi, project_id, type_id, field_id)
	if card != None:
		mochi.db.execute("update fields set card=? where project=? and type=? and id=?", card, project_id, type_id, field_id)
	if min_val != None:
		mochi.db.execute("update fields set min=? where project=? and type=? and id=?", min_val, project_id, type_id, field_id)
	if max_val != None:
		mochi.db.execute("update fields set max=? where project=? and type=? and id=?", max_val, project_id, type_id, field_id)
	if pattern != None:
		mochi.db.execute("update fields set pattern=? where project=? and type=? and id=?", pattern, project_id, type_id, field_id)
	if minlength != None:
		mochi.db.execute("update fields set minlength=? where project=? and type=? and id=?", minlength, project_id, type_id, field_id)
	if maxlength != None:
		mochi.db.execute("update fields set maxlength=? where project=? and type=? and id=?", maxlength, project_id, type_id, field_id)
	if prefix != None:
		mochi.db.execute("update fields set prefix=? where project=? and type=? and id=?", prefix, project_id, type_id, field_id)
	if suffix != None:
		mochi.db.execute("update fields set suffix=? where project=? and type=? and id=?", suffix, project_id, type_id, field_id)
	if format_str != None:
		mochi.db.execute("update fields set format=? where project=? and type=? and id=?", format_str, project_id, type_id, field_id)
	if position != None:
		mochi.db.execute("update fields set position=? where project=? and type=? and id=?", position, project_id, type_id, field_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "field/update", "project": project_id, "type_id": type_id, "id": field_id})

# Field deleted
def event_field_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("type")
	field_id = e.content("id")
	if not type_id or not field_id:
		return
	mochi.db.execute("delete from options where project=? and type=? and field=?", project_id, type_id, field_id)
	mochi.db.execute("delete from fields where project=? and type=? and id=?", project_id, type_id, field_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "field/delete", "project": project_id, "type_id": type_id, "id": field_id})

# Field reorder
def event_field_reorder(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("type")
	order = e.content("order")
	if not type_id or not order:
		return
	for i, field_id in enumerate(order):
		mochi.db.execute("update fields set sort=? where project=? and type=? and id=?", i, project_id, type_id, field_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "field/reorder", "project": project_id, "type_id": type_id})

# Option created
def event_option_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into options (project, type, field, id, name, colour, icon, sort) values (?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, e.content("type") or "", e.content("field") or "", e.content("id") or "",
		e.content("name") or "", e.content("colour") or "#94a3b8", e.content("icon") or "",
		e.content("sort") or 0
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "option/create", "project": project_id})

# Option updated
def event_option_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("type")
	field_id = e.content("field")
	option_id = e.content("id")
	if not type_id or not field_id or not option_id:
		return
	name = e.content("name")
	colour = e.content("colour")
	icon = e.content("icon")
	if name != None:
		mochi.db.execute("update options set name=? where project=? and type=? and field=? and id=?", name, project_id, type_id, field_id, option_id)
	if colour != None:
		mochi.db.execute("update options set colour=? where project=? and type=? and field=? and id=?", colour, project_id, type_id, field_id, option_id)
	if icon != None:
		mochi.db.execute("update options set icon=? where project=? and type=? and field=? and id=?", icon, project_id, type_id, field_id, option_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "option/update", "project": project_id})

# Option deleted
def event_option_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("type")
	field_id = e.content("field")
	option_id = e.content("id")
	if not type_id or not field_id or not option_id:
		return
	mochi.db.execute("delete from options where project=? and type=? and field=? and id=?", project_id, type_id, field_id, option_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "option/delete", "project": project_id})

# Option reorder
def event_option_reorder(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	type_id = e.content("type")
	field_id = e.content("field")
	order = e.content("order")
	if not type_id or not field_id or not order:
		return
	for i, option_id in enumerate(order):
		mochi.db.execute("update options set sort=? where project=? and type=? and field=? and id=?", i, project_id, type_id, field_id, option_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "option/reorder", "project": project_id})
