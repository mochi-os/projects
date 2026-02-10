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

	# 3. classes - object classes (Task, Subproject, Pull Request, etc.)
	mochi.db.execute("""create table if not exists classes (
		project text not null references projects(id),
		id text not null,
		name text not null,
		rank integer not null default 0,
		pull_requests integer not null default 0,
		primary key (project, id)
	)""")
	mochi.db.execute("create index if not exists classes_project on classes(project)")

	# 4. hierarchy - hierarchy rules (what can be parent of what)
	mochi.db.execute("""create table if not exists hierarchy (
		project text not null references projects(id),
		class text not null,
		parent text not null default '',
		primary key (project, class, parent),
		foreign key (project, class) references classes(project, id)
	)""")
	mochi.db.execute("create index if not exists hierarchy_project on hierarchy(project)")

	# 5. fields - field definitions per class
	mochi.db.execute("""create table if not exists fields (
		project text not null references projects(id),
		class text not null,
		id text not null,
		name text not null,
		fieldtype text not null,
		required integer not null default 0,
		multi integer not null default 0,
		rank integer not null default 0,
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
		rows integer not null default 1,
		primary key (project, class, id),
		foreign key (project, class) references classes(project, id)
	)""")
	mochi.db.execute("create index if not exists fields_project on fields(project)")
	mochi.db.execute("create index if not exists fields_class on fields(project, class)")

	# 6. options - enumerated options for enumerated fields
	mochi.db.execute("""create table if not exists options (
		project text not null references projects(id),
		class text not null,
		field text not null,
		id text not null,
		name text not null,
		colour text not null default '',
		icon text not null default '',
		rank integer not null default 0,
		primary key (project, class, field, id),
		foreign key (project, class, field) references fields(project, class, id)
	)""")
	mochi.db.execute("create index if not exists options_field on options(project, class, field)")

	# 7. views - board and list configurations
	mochi.db.execute("""create table if not exists views (
		project text not null references projects(id),
		id text not null,
		name text not null,
		viewtype text not null default 'board',
		filter text not null default '',
		columns text not null default '',
		rows text not null default '',
		sort text not null default '',
		direction text not null default 'asc',
		rank integer not null default 0,
		primary key (project, id)
	)""")
	mochi.db.execute("create index if not exists views_project on views(project)")

	# 8. view_classes - which classes appear in a view (empty = all classes)
	mochi.db.execute("""create table if not exists view_classes (
		project text not null,
		view text not null,
		class text not null,
		primary key (project, view, class),
		foreign key (project, view) references views(project, id),
		foreign key (project, class) references classes(project, id)
	)""")

	# 9. view_fields - which fields appear in a view
	mochi.db.execute("""create table if not exists view_fields (
		project text not null,
		view text not null,
		field text not null,
		rank integer not null default 0,
		primary key (project, view, field),
		foreign key (project, view) references views(project, id)
	)""")

	# 10. objects - the actual tasks, epics, etc.
	mochi.db.execute("""create table if not exists objects (
		id text primary key,
		project text not null references projects(id),
		class text not null,
		number integer not null,
		parent text not null default '',
		rank integer not null default 0,
		created integer not null,
		updated integer not null,
		foreign key (project, class) references classes(project, id)
	)""")
	mochi.db.execute("create index if not exists objects_project on objects(project)")
	mochi.db.execute("create index if not exists objects_class on objects(project, class)")
	mochi.db.execute("create index if not exists objects_parent on objects(parent)")
	mochi.db.execute("create index if not exists objects_rank on objects(rank)")
	mochi.db.execute("create index if not exists objects_created on objects(created)")
	mochi.db.execute("create index if not exists objects_updated on objects(updated)")

	# 11. links - links between objects (blocks, relates to, duplicates, etc.)
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

	# 12. values - field values on objects
	mochi.db.execute("""create table if not exists "values" (
		object text not null references objects(id),
		field text not null,
		value text not null default '',
		primary key (object, field)
	)""")
	mochi.db.execute("create index if not exists values_object on \"values\"(object)")
	mochi.db.execute("create index if not exists values_owner on \"values\"(value) where field='owner'")

	# 13. comments - comments on objects
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

	# 14. activity - activity history on objects
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

	# 15. watchers - users subscribed to object updates
	mochi.db.execute("""create table if not exists watchers (
		object text not null references objects(id),
		user text not null,
		created integer not null,
		primary key (object, user)
	)""")
	mochi.db.execute("create index if not exists watchers_user on watchers(user)")

	# 16. attachments - file attachments on objects (uses Mochi attachment system)
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

	# 17. pull_requests - pull requests attached to objects
	mochi.db.execute("""create table if not exists pull_requests (
		id text primary key,
		object text not null references objects(id),
		repository text not null default '',
		source text not null default '',
		target text not null default '',
		status text not null default 'open',
		title text not null default '',
		description text not null default '',
		draft integer not null default 0,
		created integer not null,
		updated integer not null
	)""")
	mochi.db.execute("create index if not exists pull_requests_object on pull_requests(object)")

	# Migrations
	mochi.db.execute("update views set viewtype='list' where viewtype='tree'")

# Upgrade database schema
def database_upgrade(from_version, to_version):
	if from_version < 2:
		mochi.db.execute("alter table pull_requests add column title text not null default ''")
		mochi.db.execute("alter table pull_requests add column description text not null default ''")
		mochi.db.execute("alter table pull_requests add column draft integer not null default 0")


# ============================================================================
# Templates
# ============================================================================

# Get available project templates from JSON files
def get_templates():
	templates = {}
	files = mochi.app.file.list("templates") or []
	for filename in files:
		if filename.endswith(".json"):
			content = mochi.app.file.read("templates/" + filename)
			if content:
				data = json.decode(str(content))
				templates[data["id"]] = {
					"id": data["id"],
					"name": data["name"],
					"description": data.get("description", ""),
					"icon": data.get("icon", "")
				}
	return templates

# Apply a template to a project by loading from JSON
def apply_template(project_id, template_id):
	# Load template JSON
	content = mochi.app.file.read("templates/" + template_id + ".json")
	data = json.decode(str(content))

	# Create classes
	for t in data.get("classes", []):
		mochi.db.execute(
			"insert into classes (project, id, name, rank, pull_requests) values (?, ?, ?, ?, ?)",
			project_id, t["id"], t["name"], t.get("rank", 0), t.get("pull_requests", 0)
		)

	# Set hierarchy for each class
	for cls_id, parents in data.get("hierarchy", {}).items():
		for parent in parents:
			mochi.db.execute(
				"insert into hierarchy (project, class, parent) values (?, ?, ?)",
				project_id, cls_id, parent
			)

	# Create fields for each class
	for cls_id, fields in data.get("fields", {}).items():
		for f in fields:
			mochi.db.execute(
				"insert into fields (project, class, id, name, fieldtype, required, card, rank, rows) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
				project_id, cls_id, f["id"], f["name"], f.get("fieldtype", "text"),
				f.get("required", 0), f.get("card", 0), f.get("rank", 0), f.get("rows", 1)
			)

	# Create options for each class's enumerated fields
	for cls_id, class_options in data.get("options", {}).items():
		for field_id, field_options in class_options.items():
			for opt in field_options:
				mochi.db.execute(
					"insert into options (project, class, field, id, name, colour, rank) values (?, ?, ?, ?, ?, ?, ?)",
					project_id, cls_id, field_id, opt["id"], opt["name"],
					opt.get("colour", "#94a3b8"), opt.get("rank", 0)
				)

	# Create views
	for i, v in enumerate(data.get("views", [])):
		mochi.db.execute(
			"insert into views (project, id, name, viewtype, columns, rows, rank) values (?, ?, ?, ?, ?, ?, ?)",
			project_id, v["id"], v["name"], v.get("viewtype", "board"),
			v.get("columns", ""), v.get("rows", ""), i
		)
		# Add view classes if specified
		for vclass in v.get("classes", []):
			mochi.db.execute(
				"insert into view_classes (project, view, class) values (?, ?, ?)",
				project_id, v["id"], vclass
			)
		# Add fields
		fields = v.get("fields", "").split(",")
		for i, field in enumerate(fields):
			if field.strip():
				mochi.db.execute(
					"insert into view_fields (project, view, field, rank) values (?, ?, ?, ?)",
					project_id, v["id"], field.strip(), i
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

	# Apply template (blank template creates nothing)
	if template != "blank":
		apply_template(entity, template)

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

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	row = mochi.db.row("select id, name, description, prefix, counter, owner, server, created, updated from projects where id=?", project_id)
	if not row:
		a.error(404, "Project not found")
		return

	# Get classes
	classes = mochi.db.rows("select id, name, rank, pull_requests from classes where project=? order by rank", project_id) or []

	# Get fields by class
	fields = {}
	for c in classes:
		class_fields = mochi.db.rows("select id, name, fieldtype, required, multi, rank, card, position, rows from fields where project=? and class=? order by rank", project_id, c["id"]) or []
		fields[c["id"]] = class_fields

	# Get options by class and field
	options = {}
	for c in classes:
		options[c["id"]] = {}
		for f in fields.get(c["id"], []):
			if f["fieldtype"] == "enumerated":
				field_options = mochi.db.rows("select id, name, colour, icon, rank from options where project=? and class=? and field=? order by rank", project_id, c["id"], f["id"]) or []
				options[c["id"]][f["id"]] = field_options

	# Get views
	views = mochi.db.rows("select id, name, viewtype, filter, columns, rows, sort, direction, rank from views where project=? order by rank, name", project_id) or []

	# Add classes and fields to each view
	for v in views:
		view_classes = mochi.db.rows("select class from view_classes where project=? and view=?", project_id, v["id"]) or []
		v["classes"] = [vc["class"] for vc in view_classes]
		view_fields = mochi.db.rows("select field from view_fields where project=? and view=? order by rank", project_id, v["id"]) or []
		v["fields"] = ",".join([vf["field"] for vf in view_fields])

	# Get hierarchy
	hierarchy = {}
	for c in classes:
		parents = mochi.db.rows("select parent from hierarchy where project=? and class=?", project_id, c["id"]) or []
		hierarchy[c["id"]] = [p["parent"] for p in parents]

	# Determine access level
	if row["owner"] == 1:
		resource = "project/" + project_id
		if mochi.access.check(a.user.identity.id, resource, "*"):
			access = "owner"
		elif check_project_access(a.user.identity.id, project_id, "design"):
			access = "design"
		elif check_project_access(a.user.identity.id, project_id, "write"):
			access = "write"
		elif check_project_access(a.user.identity.id, project_id, "comment"):
			access = "comment"
		elif check_project_access(a.user.identity.id, project_id, "view"):
			access = "view"
		else:
			a.error(403, "Access denied")
			return
	else:
		response = mochi.remote.request(project_id, "projects", "access/check", {
			"user": a.user.identity.id,
		})
		if response:
			if response.get("design"):
				access = "design"
			elif response.get("write"):
				access = "write"
			elif response.get("comment"):
				access = "comment"
			elif response.get("view"):
				access = "view"
			else:
				a.error(403, "Access denied")
				return
		else:
			a.error(403, "Access denied")
			return

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
			"access": access,
		},
		"classes": classes,
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

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	row = mochi.db.row("select id, owner from projects where id=?", project_id)
	if not row:
		a.error(404, "Project not found")
		return

	if row["owner"] != 1:
		a.error(403, "Cannot update remote project")
		return

	if not mochi.access.check(a.user.identity.id, "project/" + project_id, "*"):
		a.error(403, "Access denied")
		return

	name = a.input("name")
	description = a.input("description")
	prefix = a.input("prefix")

	now = mochi.time.now()

	if name:
		if not mochi.valid(name, "name"):
			a.error(400, "Invalid name")
			return
		mochi.db.execute("update projects set name=?, updated=? where id=?", name, now, project_id)
		mochi.entity.rename(project_id, name)

	if description != None:
		mochi.db.execute("update projects set description=?, updated=? where id=?", description, now, project_id)

	if prefix:
		mochi.db.execute("update projects set prefix=?, updated=? where id=?", prefix, now, project_id)

	broadcast_event(project_id, "project/update", {
		"project": project_id, "name": name or "", "description": description or "", "prefix": prefix or ""
	})

	return {"data": {"success": True}}

# Delete project
def action_project_delete(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	row = mochi.db.row("select id, owner from projects where id=?", project_id)
	if not row:
		a.error(404, "Project not found")
		return

	if row["owner"] != 1:
		a.error(403, "Cannot delete remote project")
		return

	if not mochi.access.check(a.user.identity.id, "project/" + project_id, "*"):
		a.error(403, "Access denied")
		return

	# Delete in reverse dependency order
	mochi.db.execute("delete from attachments where object in (select id from objects where project=?)", project_id)
	mochi.db.execute("delete from watchers where object in (select id from objects where project=?)", project_id)
	mochi.db.execute("delete from activity where object in (select id from objects where project=?)", project_id)
	mochi.db.execute("delete from comments where object in (select id from objects where project=?)", project_id)
	mochi.db.execute("delete from \"values\" where object in (select id from objects where project=?)", project_id)
	mochi.db.execute("delete from links where project=?", project_id)
	mochi.db.execute("delete from objects where project=?", project_id)
	mochi.db.execute("delete from views where project=?", project_id)
	mochi.db.execute("delete from options where project=?", project_id)
	mochi.db.execute("delete from fields where project=?", project_id)
	mochi.db.execute("delete from hierarchy where project=?", project_id)
	mochi.db.execute("delete from classes where project=?", project_id)
	# Notify subscribers that project is being deleted (before removing subscriber list)
	subscribers = mochi.db.rows("select id from subscribers where project=?", project_id)
	for sub in subscribers:
		mochi.message.send(p2p_headers(a.user.identity.id, sub["id"], "deleted"), {"project": project_id})

	mochi.db.execute("delete from subscribers where project=?", project_id)
	mochi.db.execute("delete from projects where id=?", project_id)

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

	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
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
# Access Control
# ============================================================================

# Access levels for projects (from most to least permissive)
ACCESS_LEVELS = ["design", "write", "comment", "view"]

# Check if a user has cumulative access to a project at the given level
def check_project_access(user_id, project_id, level):
	resource = "project/" + project_id
	if mochi.access.check(user_id, resource, "*"):
		return True
	levels = ["view", "comment", "write", "design"]
	if level in levels:
		idx = levels.index(level)
		for l in levels[idx:]:
			if mochi.access.check(user_id, resource, l):
				return True
	return False

# Forward a subscriber action to the project owner via P2P
def forward_to_owner(a, project_id, action, params):
	params["_user"] = a.user.identity.id
	params["_name"] = a.user.identity.name
	result = mochi.remote.request(project_id, "projects", "request", {
		"action": action,
		"params": params,
	})
	if not result:
		a.error(502, "Could not reach project owner")
		return None
	if result.get("error"):
		a.error(result.get("code", 500), result["error"])
		return None
	return {"data": result}

# List access rules for a project
def action_access_list(a):
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

	# Only owner can manage access
	if project["owner"] != 1:
		a.error(403, "Access denied")
		return

	# Get owner info
	owner = {"id": a.user.identity.id, "name": a.user.identity.name}

	resource = "project/" + project_id
	rules = mochi.access.list.resource(resource)

	# Resolve names for rules and mark owner
	filtered_rules = []
	for rule in rules:
		subject = rule.get("subject", "")
		# Mark owner rules
		if subject == owner.get("id"):
			rule["isOwner"] = True
		# Resolve names for non-special subjects
		if subject and subject not in ("*", "+") and not subject.startswith("#"):
			if subject.startswith("@"):
				# Look up group name
				group_id = subject[1:]
				group = mochi.db.row("select name from groups where id=?", group_id)
				rule["name"] = group["name"] if group else subject
			else:
				# Look up entity name
				name = mochi.entity.name(subject)
				rule["name"] = name if name else subject[:9]
		filtered_rules.append(rule)

	return {"data": {"rules": filtered_rules, "owner": owner}}

# Set access level for a subject
def action_access_set(a):
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

	# Only owner can manage access
	if project["owner"] != 1:
		a.error(403, "Access denied")
		return

	subject = a.input("subject")
	level = a.input("level")

	if not subject:
		a.error(400, "Subject is required")
		return
	if len(subject) > 255:
		a.error(400, "Subject too long")
		return

	if not level:
		a.error(400, "Level is required")
		return

	if level not in ["view", "comment", "write", "design", "none"]:
		a.error(400, "Invalid level")
		return

	resource = "project/" + project_id

	# Revoke all existing rules for this subject first (including wildcard)
	for op in ACCESS_LEVELS + ["*"]:
		mochi.access.revoke(subject, resource, op)

	# Then set the new level
	granter = a.user.identity.id
	if level == "none":
		# Store deny rules for all levels to block access
		for op in ACCESS_LEVELS:
			mochi.access.deny(subject, resource, op, granter)
	else:
		# Store a single allow rule for the level
		mochi.access.allow(subject, resource, level, granter)

	return {"data": {"success": True}}

# Revoke access for a subject
def action_access_revoke(a):
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

	# Only owner can manage access
	if project["owner"] != 1:
		a.error(403, "Access denied")
		return

	subject = a.input("subject")

	if not subject:
		a.error(400, "Subject is required")
		return
	if len(subject) > 255:
		a.error(400, "Subject too long")
		return

	resource = "project/" + project_id

	# Revoke all rules for this subject
	for op in ACCESS_LEVELS + ["*"]:
		mochi.access.revoke(subject, resource, op)

	return {"data": {"success": True}}


# ============================================================================
# Object Templates
# ============================================================================



# ============================================================================
# Helper Functions
# ============================================================================

def resolve_project(a):
	"""Resolve project ID from param, handling fingerprints."""
	project_id = a.input("project")
	if not project_id:
		return None
	if len(project_id) == 9:
		rows = mochi.db.rows("select id from projects")
		for row in rows:
			if mochi.entity.fingerprint(row["id"]) == project_id:
				return row["id"]
		return None
	return project_id

def get_project(project_id):
	"""Get project row or None."""
	return mochi.db.row("select * from projects where id=?", project_id)

def log_activity(object_id, actor, action, field="", oldvalue="", newvalue=""):
	"""Log an activity entry for an object."""
	activity_id = mochi.uid()
	now = mochi.time.now()
	mochi.db.execute(
		"insert into activity (id, object, actor, action, field, oldvalue, newvalue, created) values (?, ?, ?, ?, ?, ?, ?, ?)",
		activity_id, object_id, actor, action, field, str(oldvalue), str(newvalue), now
	)

def get_owner_identity(project_id):
	"""Get the project owner's identity from the first subscriber."""
	row = mochi.db.row("select id from subscribers where project=? order by subscribed limit 1", project_id)
	return row["id"] if row else ""

def notify_watchers(object_id, project_id, local_identity, actor_id, title, body):
	"""Notify local user if they watch this object and didn't make the change."""
	if local_identity == actor_id:
		return
	if not mochi.db.exists("select 1 from watchers where object=? and user=?", object_id, local_identity):
		return
	project = get_project(project_id)
	if not project:
		return
	obj = mochi.db.row("select number, class from objects where id=?", object_id)
	prefix = project["prefix"] if project else ""
	readable = prefix + "-" + str(obj["number"]) if obj and prefix else ""
	# Use the first field (rank 0) of the object's class as the display name
	first_field_row = mochi.db.row("select id from fields where class=? order by rank limit 1", obj["class"]) if obj else None
	first_field = first_field_row["id"] if first_field_row else ""
	title_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, first_field) if first_field else None
	obj_title = title_row["value"] if title_row else ""
	if obj_title:
		display = obj_title + " - " + title
	else:
		display = readable + " " + title if readable else title
	fp = mochi.entity.fingerprint(project_id)
	url = "/projects/" + fp if fp else "/projects"
	mochi.service.call("notifications", "send", "update", display, body, object_id, url)

def would_create_cycle(object_id, new_parent_id):
	"""Check if setting new_parent_id as parent of object_id would create a cycle."""
	if not new_parent_id:
		return False
	current = new_parent_id
	while current:
		if current == object_id:
			return True
		parent_row = mochi.db.row("select parent from objects where id=?", current)
		current = parent_row["parent"] if parent_row else ""
	return False

def delete_object_cascade(project_id, object_id, actor=""):
	"""Delete an object and all its children recursively."""
	# First, recursively delete all children
	children = mochi.db.rows("select id from objects where parent=?", object_id)
	for child in children:
		delete_object_cascade(project_id, child["id"], actor)

	# Then delete this object's related data
	mochi.db.execute("delete from pull_requests where object=?", object_id)
	mochi.db.execute("delete from attachments where object=?", object_id)
	mochi.db.execute("delete from watchers where object=?", object_id)
	mochi.db.execute("delete from activity where object=?", object_id)
	mochi.db.execute("delete from comments where object=?", object_id)
	mochi.db.execute("delete from \"values\" where object=?", object_id)
	mochi.db.execute("delete from links where source=? or target=?", object_id, object_id)
	mochi.db.execute("delete from objects where id=?", object_id)

	# Broadcast delete event for each object
	broadcast_event(project_id, "object/delete", {"project": project_id, "id": object_id, "actor": actor})


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

	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	# Get filter params
	class_filter = a.input("class")
	parent_filter = a.input("parent")

	# Build query
	query = "select o.id, o.project, o.class, o.number, o.parent, o.rank, o.created, o.updated from objects o where o.project=?"
	params = [project_id]

	if class_filter:
		query += " and o.class=?"
		params.append(class_filter)

	if parent_filter:
		query += " and o.parent=?"
		params.append(parent_filter)

	query += " order by o.rank asc, o.created desc"

	rows = mochi.db.rows(query, *params) or []

	# Get values for each object
	objects = []
	for row in rows:
		obj = {
			"id": row["id"],
			"project": row["project"],
			"class": row["class"],
			"number": row["number"],
			"parent": row["parent"],
			"rank": row["rank"],
			"created": row["created"],
			"updated": row["updated"],
			"values": {}
		}

		# Get field values
		values = mochi.db.rows("select field, value from \"values\" where object=?", row["id"]) or []
		for v in values:
			obj["values"][v["field"]] = v["value"]

		objects.append(obj)

	# Get watched object IDs for the local user
	watched = mochi.db.rows(
		"select w.object from watchers w join objects o on o.id=w.object where o.project=? and w.user=?",
		project_id, a.user.identity.id) or []

	return {"data": {"objects": objects, "watched": [w["object"] for w in watched]}}

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

	obj_class = a.input("class")
	parent = a.input("parent") or ""
	title = a.input("title") or ""

	if project["owner"] != 1:
		result = forward_to_owner(a, project_id, "object/create", {
			"project": project_id, "class": obj_class,
			"title": title, "parent": parent,
		})
		if result and result.get("data"):
			d = result["data"]
			obj = d.get("object", {})
			if obj.get("id"):
				now = mochi.time.now()
				mochi.db.execute(
					"insert or ignore into objects (id, project, class, number, parent, rank, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?)",
					obj["id"], project_id, obj.get("class", ""), obj.get("number", 0), obj.get("parent", ""), obj.get("rank", 0), now, now
				)
				if title:
					mochi.db.execute("insert or replace into \"values\" (object, field, value) values (?, ?, ?)", obj["id"], "title", title)
				# Update local counter
				mochi.db.execute("update projects set counter=counter+1, updated=? where id=?", now, project_id)
		return result

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	if not obj_class:
		a.error(400, "Class is required")
		return

	# Verify class exists
	class_row = mochi.db.row("select id from classes where project=? and id=?", project_id, obj_class)
	if not class_row:
		a.error(400, "Invalid class")
		return

	# Increment counter and get number
	new_counter = project["counter"] + 1
	mochi.db.execute("update projects set counter=?, updated=? where id=?", new_counter, mochi.time.now(), project_id)

	# Calculate initial rank (add to end)
	max_rank_row = mochi.db.row("select coalesce(max(rank), 0) as max_rank from objects where project=?", project_id)
	initial_rank = (max_rank_row["max_rank"] if max_rank_row else 0) + 1

	# Create object
	object_id = mochi.uid()
	now = mochi.time.now()

	mochi.db.execute(
		"insert into objects (id, project, class, number, parent, rank, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?)",
		object_id, project_id, obj_class, new_counter, parent, initial_rank, now, now
	)

	# Set title if provided
	values = {}
	if title:
		mochi.db.execute("insert into \"values\" (object, field, value) values (?, ?, ?)", object_id, "title", title)
		values["title"] = title

	# Log activity
	log_activity(object_id, a.user.identity.id, "created")

	# Auto-watch creator
	mochi.db.execute("insert into watchers (object, user, created) values (?, ?, ?)", object_id, a.user.identity.id, now)

	# Broadcast to subscribers
	broadcast_event(project_id, "object/create", {
		"project": project_id, "id": object_id, "class": obj_class,
		"number": new_counter, "parent": parent, "values": values,
		"created": now, "actor": a.user.identity.id
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

	project = get_project(project_id)
	if project and project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select * from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	project = get_project(project_id)

	# Get values
	values = {}
	value_rows = mochi.db.rows("select field, value from \"values\" where object=?", object_id) or []
	for v in value_rows:
		values[v["field"]] = v["value"]

	# Get links
	links = mochi.db.rows("select target, linktype, created from links where source=?", object_id) or []
	linked_by = mochi.db.rows("select source, linktype, created from links where target=?", object_id) or []

	# Check if user is watching
	watching = mochi.db.exists("select 1 from watchers where object=? and user=?", object_id, a.user.identity.id)

	# Clear notifications for this object if watching
	if watching:
		mochi.service.call("notifications", "clear.object", "projects", object_id)

	# Get pull requests
	prs = mochi.db.rows("select id, object, repository, source, target, status, title, description, draft, created, updated from pull_requests where object=?", object_id) or []

	# Get comment count
	comment_row = mochi.db.row("select count(*) as count from comments where object=?", object_id)
	comment_count = comment_row["count"] if comment_row else 0

	return {"data": {
		"object": {
			"id": row["id"],
			"project": row["project"],
			"class": row["class"],
			"number": row["number"],
			"parent": row["parent"],
			"created": row["created"],
			"updated": row["updated"],
			"readable": project["prefix"] + "-" + str(row["number"])
		},
		"values": values,
		"links": links,
		"linked_by": linked_by,
		"watching": watching,
		"prs": prs,
		"comment_count": comment_count,
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

	object_id = a.input("object")

	if project["owner"] != 1:
		params = {"project": project_id, "object": object_id}
		p = a.input("parent")
		if p != None:
			params["parent"] = p
		c = a.input("class")
		if c:
			params["class"] = c
		result = forward_to_owner(a, project_id, "object/update", params)
		if result and object_id:
			now = mochi.time.now()
			if p != None:
				mochi.db.execute("update objects set parent=?, updated=? where id=?", p, now, object_id)
			if c:
				mochi.db.execute("update objects set class=?, updated=? where id=?", c, now, object_id)
		return result

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select * from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	now = mochi.time.now()

	# Update parent if provided
	parent = a.input("parent")
	if parent != None:
		old_parent = row["parent"]
		if parent != old_parent:
			# Check for cycles
			if parent and would_create_cycle(object_id, parent):
				a.error(400, "Cannot set parent: would create a cycle")
				return
			# Check hierarchy rules
			if parent:
				parent_row = mochi.db.row("select class from objects where id=? and project=?", parent, project_id)
				if not parent_row:
					a.error(404, "Parent object not found")
					return
				parent_class = parent_row["class"]
			else:
				parent_class = ""
			allowed = mochi.db.exists("select 1 from hierarchy where project=? and class=? and parent=?", project_id, row["class"], parent_class)
			if not allowed:
				a.error(400, "Cannot set parent: hierarchy rules do not allow this relationship")
				return
			mochi.db.execute("update objects set parent=?, updated=? where id=?", parent, now, object_id)
			log_activity(object_id, a.user.identity.id, "moved", "parent", old_parent, parent)

	# Update class if provided
	new_class = a.input("class")
	if new_class and new_class != row["class"]:
		# Verify class exists
		class_row = mochi.db.row("select id from classes where project=? and id=?", project_id, new_class)
		if class_row:
			mochi.db.execute("update objects set class=?, updated=? where id=?", new_class, now, object_id)
			log_activity(object_id, a.user.identity.id, "updated", "class", row["class"], new_class)

	mochi.db.execute("update objects set updated=? where id=?", now, object_id)

	broadcast_event(project_id, "object/update", {
		"project": project_id, "id": object_id,
		"parent": parent if parent != None else row["parent"],
		"class": new_class if new_class and new_class != row["class"] else row["class"],
		"actor": a.user.identity.id
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

	object_id = a.input("object")

	if project["owner"] != 1:
		result = forward_to_owner(a, project_id, "object/delete", {
			"project": project_id, "object": object_id,
		})
		if result and object_id:
			mochi.db.execute("delete from \"values\" where object=?", object_id)
			mochi.db.execute("delete from watchers where object=?", object_id)
			mochi.db.execute("delete from comments where object=?", object_id)
			mochi.db.execute("delete from links where source=? or target=?", object_id, object_id)
			mochi.db.execute("delete from objects where id=?", object_id)
		return result

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Cascade delete this object and all its children
	delete_object_cascade(project_id, object_id, a.user.identity.id)

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

	object_id = a.input("object")

	if project["owner"] != 1:
		params = {
			"project": project_id, "object": object_id,
			"field": a.input("field") or "", "value": a.input("value"),
			"rank": a.input("rank"),
		}
		rf = a.input("row_field")
		if rf:
			params["row_field"] = rf
			params["row_value"] = a.input("row_value")
		result = forward_to_owner(a, project_id, "object/move", params)
		if result and object_id:
			now = mochi.time.now()
			field = a.input("field") or ""
			value = a.input("value")
			rank = a.input("rank")
			if value:
				mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field, value)
			if rank:
				mochi.db.execute("update objects set rank=?, updated=? where id=?", int(rank), now, object_id)
			if rf:
				mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, rf, a.input("row_value"))
			mochi.db.execute("update objects set updated=? where id=?", now, object_id)
		return result

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id, rank from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	old_rank = row["rank"]
	field = a.input("field") or ""
	value = a.input("value")  # New column value
	new_rank = a.input("rank")

	# Get old field value
	old_value_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, field)
	old_value = old_value_row["value"] if old_value_row else ""

	# Determine target value (use provided or keep current)
	target_value = value if value else old_value
	value_changed = old_value != target_value

	# Handle field value change
	if value_changed:
		mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field, target_value)
		log_activity(object_id, a.user.identity.id, "updated", field, old_value, target_value)

	# Handle rank change
	if new_rank != None:
		new_rank = int(new_rank)
		# Shift other objects to make room
		if value_changed or new_rank != old_rank:
			# Get all objects in the target column
			objects_in_column = mochi.db.rows("""
				select o.id, o.rank from objects o
				left join "values" v on v.object = o.id and v.field=?
				where o.project=? and coalesce(v.value, '')=? and o.id!=?
				order by o.rank asc
			""", field, project_id, target_value, object_id) or []

			# Renumber all objects, inserting this one at the new position
			rank = 1
			for obj in objects_in_column:
				if rank == new_rank:
					rank += 1  # Skip the position for our object
				mochi.db.execute("update objects set rank=? where id=?", rank, obj["id"])
				rank += 1

			# Set our object's rank
			mochi.db.execute("update objects set rank=? where id=?", new_rank, object_id)
	elif value_changed:
		# Moving to new column without specific rank - add to end
		max_rank_row = mochi.db.row("""
			select coalesce(max(o.rank), 0) as max_rank from objects o
			left join "values" v on v.object = o.id and v.field=?
			where o.project=? and coalesce(v.value, '')=? and o.id!=?
		""", field, project_id, target_value, object_id)
		new_rank = (max_rank_row["max_rank"] if max_rank_row else 0) + 1
		mochi.db.execute("update objects set rank=? where id=?", new_rank, object_id)

	# Handle row field change (for swimlane drag-drop)
	row_field = a.input("row_field")
	row_value = a.input("row_value")
	row_changed = False
	if row_field:
		old_row_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, row_field)
		old_row_value = old_row_row["value"] if old_row_row else ""
		if old_row_value != row_value:
			mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, row_field, row_value)
			log_activity(object_id, a.user.identity.id, "updated", row_field, old_row_value, row_value)
			row_changed = True

	mochi.db.execute("update objects set updated=? where id=?", mochi.time.now(), object_id)

	updated_values = {}
	if value_changed:
		updated_values[field] = target_value
	if row_changed:
		updated_values[row_field] = row_value
	if updated_values:
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id,
			"values": updated_values, "actor": a.user.identity.id
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

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id, class from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Get valid fields for this class
	valid_fields = {}
	field_types = {}
	field_rows = mochi.db.rows("select id, name, fieldtype from fields where project=? and class=?", project_id, row["class"]) or []
	for f in field_rows:
		valid_fields[f["id"]] = f["name"]
		field_types[f["id"]] = f["fieldtype"]

	if project["owner"] != 1:
		values = {}
		for field_id in valid_fields:
			v = a.input(field_id)
			if v != None:
				values[field_id] = str(v)
		result = forward_to_owner(a, project_id, "values/set", {
			"project": project_id, "object": object_id, "values": values,
		})
		if result:
			for field_id, value in values.items():
				mochi.db.execute(
					"insert or replace into \"values\" (object, field, value) values (?, ?, ?)",
					object_id, field_id, value
				)
		return result

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	now = mochi.time.now()
	changes = []

	# Process each field from input
	for field_id in valid_fields:
		new_value = a.input(field_id)
		if new_value != None:
			# Get old value
			old_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, field_id)
			old_value = old_row["value"] if old_row else ""

			if str(new_value) != old_value:
				mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field_id, str(new_value))
				log_activity(object_id, a.user.identity.id, "updated", field_id, old_value, str(new_value))
				changes.append(field_id)

	if changes:
		mochi.db.execute("update objects set updated=? where id=?", now, object_id)
		# Collect changed values for broadcast
		changed_values = {}
		for fid in changes:
			val = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, fid)
			if val:
				changed_values[fid] = val["value"]
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id, "values": changed_values,
			"actor": a.user.identity.id
		})
		# Auto-watch assigned users
		for fid in changes:
			if field_types.get(fid) == "user":
				assigned = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, fid)
				if assigned and assigned["value"]:
					mochi.db.execute(
						"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
						object_id, assigned["value"], now)

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
		result = forward_to_owner(a, project_id, "value/set", {
			"project": project_id, "object": a.input("object"),
			"field": a.input("field"), "value": a.input("value") or "",
		})
		if result:
			# Update local cache so subsequent reads reflect the change
			mochi.db.execute(
				"insert or replace into \"values\" (object, field, value) values (?, ?, ?)",
				a.input("object"), a.input("field"), a.input("value") or ""
			)
		return result

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	field_id = a.input("field")
	if not field_id:
		a.error(400, "Field ID required")
		return

	row = mochi.db.row("select id, class from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Verify field exists for this class
	field_row = mochi.db.row("select id, fieldtype from fields where project=? and class=? and id=?", project_id, row["class"], field_id)
	if not field_row:
		a.error(400, "Invalid field for this class")
		return

	new_value = a.input("value")
	if new_value == None:
		new_value = ""

	# Get old value
	old_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, field_id)
	old_value = old_row["value"] if old_row else ""

	if str(new_value) != old_value:
		mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field_id, str(new_value))
		now = mochi.time.now()
		mochi.db.execute("update objects set updated=? where id=?", now, object_id)
		log_activity(object_id, a.user.identity.id, "updated", field_id, old_value, str(new_value))
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id,
			"values": {field_id: str(new_value)}, "actor": a.user.identity.id
		})
		# Auto-watch assigned user
		if field_row["fieldtype"] == "user" and str(new_value):
			mochi.db.execute(
				"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
				object_id, str(new_value), now)

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

	project = get_project(project_id)
	if project and project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Get outgoing links
	outgoing = mochi.db.rows("""
		select l.target, l.linktype, l.created, o.number, o.class, v.value as title
		from links l
		join objects o on o.id = l.target
		left join "values" v on v.object = l.target and v.field = 'title'
		where l.source=?
	""", object_id) or []

	# Get incoming links
	incoming = mochi.db.rows("""
		select l.source, l.linktype, l.created, o.number, o.class, v.value as title
		from links l
		join objects o on o.id = l.source
		left join "values" v on v.object = l.source and v.field = 'title'
		where l.target=?
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
		return forward_to_owner(a, project_id, "link/create", {
			"project": project_id, "object": a.input("object"),
			"target": a.input("target"), "linktype": a.input("linktype"),
		})

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
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
	source_row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	target_row = mochi.db.row("select id from objects where id=? and project=?", target_id, project_id)

	if not source_row or not target_row:
		a.error(404, "Object not found")
		return

	if object_id == target_id:
		a.error(400, "Cannot link object to itself")
		return

	# Check if link already exists
	existing = mochi.db.exists("select 1 from links where source=? and target=? and linktype=?", object_id, target_id, linktype)
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
		"target": target_id, "linktype": linktype, "created": now,
		"actor": a.user.identity.id
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
		return forward_to_owner(a, project_id, "link/delete", {
			"project": project_id, "object": a.input("object"),
			"target": a.input("target"), "linktype": a.input("linktype"),
		})

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	target_id = a.input("target")
	linktype = a.input("linktype")

	if not object_id or not target_id or not linktype:
		a.error(400, "Object, target, and linktype are required")
		return

	mochi.db.execute("delete from links where source=? and target=? and linktype=?", object_id, target_id, linktype)

	broadcast_event(project_id, "link/delete", {
		"project": project_id, "source": object_id,
		"target": target_id, "linktype": linktype, "actor": a.user.identity.id
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

	project = get_project(project_id)
	if project and project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	comments = mochi.db.rows(
		"select id, parent, author, name, content, created, edited from comments where object=? order by created asc",
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
	content = a.input("content")
	parent = a.input("parent") or ""

	if project["owner"] != 1:
		return forward_to_owner(a, project_id, "comment/create", {
			"project": project_id, "object": object_id,
			"content": content, "parent": parent,
		})

	if not check_project_access(a.user.identity.id, project_id, "comment"):
		a.error(403, "Access denied")
		return

	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	if not content or not content.strip():
		a.error(400, "Content is required")
		return

	comment_id = mochi.uid()
	now = mochi.time.now()

	mochi.db.execute(
		"insert into comments (id, object, parent, author, name, content, created, edited) values (?, ?, ?, ?, ?, ?, ?, ?)",
		comment_id, object_id, parent, a.user.identity.id, a.user.identity.name, content.strip(), now, 0
	)

	mochi.db.execute("update objects set updated=? where id=?", now, object_id)
	log_activity(object_id, a.user.identity.id, "commented")

	# Auto-watch on comment
	mochi.db.execute(
		"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
		object_id, a.user.identity.id, now)

	broadcast_event(project_id, "comment/create", {
		"project": project_id, "object": object_id,
		"id": comment_id, "parent": parent,
		"author": a.user.identity.id, "name": a.user.identity.name,
		"content": content.strip(), "created": now, "actor": a.user.identity.id
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

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	object_id = a.input("object")
	comment_id = a.input("comment")
	content = a.input("content")

	if project["owner"] != 1:
		return forward_to_owner(a, project_id, "comment/update", {
			"project": project_id, "object": object_id,
			"comment": comment_id, "content": content,
		})

	if not check_project_access(a.user.identity.id, project_id, "comment"):
		a.error(403, "Access denied")
		return

	if not object_id or not comment_id:
		a.error(400, "Object and comment ID required")
		return

	comment = mochi.db.row("select * from comments where id=? and object=?", comment_id, object_id)
	if not comment:
		a.error(404, "Comment not found")
		return

	# Only author can edit
	if comment["author"] != a.user.identity.id:
		a.error(403, "Cannot edit another user's comment")
		return

	if not content or not content.strip():
		a.error(400, "Content is required")
		return

	now = mochi.time.now()
	mochi.db.execute("update comments set content=?, edited=? where id=?", content.strip(), now, comment_id)

	broadcast_event(project_id, "comment/update", {
		"project": project_id, "object": object_id,
		"id": comment_id, "content": content.strip(), "edited": now,
		"actor": a.user.identity.id
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

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	object_id = a.input("object")
	comment_id = a.input("comment")

	if project["owner"] != 1:
		return forward_to_owner(a, project_id, "comment/delete", {
			"project": project_id, "object": object_id,
			"comment": comment_id,
		})

	if not check_project_access(a.user.identity.id, project_id, "comment"):
		a.error(403, "Access denied")
		return

	if not object_id or not comment_id:
		a.error(400, "Object and comment ID required")
		return

	comment = mochi.db.row("select * from comments where id=? and object=?", comment_id, object_id)
	if not comment:
		a.error(404, "Comment not found")
		return

	# Only author can delete
	if comment["author"] != a.user.identity.id:
		a.error(403, "Cannot delete another user's comment")
		return

	mochi.db.execute("delete from comments where id=?", comment_id)

	broadcast_event(project_id, "comment/delete", {
		"project": project_id, "object": object_id, "id": comment_id,
		"actor": a.user.identity.id
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

	project = get_project(project_id)
	if project and project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	attachments = mochi.db.rows(
		"select id, name, size, mimetype, created from attachments where object=? order by created desc",
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
		a.error(403, "Attachment uploads are not available for subscribed projects")
		return

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
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

	mochi.db.execute("update objects set updated=? where id=?", now, object_id)
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
		return forward_to_owner(a, project_id, "attachment/delete", {
			"project": project_id, "object": a.input("object"),
			"attachment": a.input("attachment"),
		})

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	attachment_id = a.input("attachment")

	if not object_id or not attachment_id:
		a.error(400, "Object and attachment ID required")
		return

	attachment = mochi.db.row("select * from attachments where id=? and object=?", attachment_id, object_id)
	if not attachment:
		a.error(404, "Attachment not found")
		return

	# Delete file
	mochi.attachment.delete(object_id, attachment_id)

	# Delete record
	mochi.db.execute("delete from attachments where id=?", attachment_id)

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

	project = get_project(project_id)
	if project and project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	rows = mochi.db.rows(
		"select id, actor, action, field, oldvalue, newvalue, created from activity where object=? order by created desc",
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

	project = get_project(project_id)
	if project and project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	watchers = mochi.db.rows("select user, created from watchers where object=?", object_id) or []

	# Check if current user is watching
	watching = mochi.db.exists("select 1 from watchers where object=? and user=?", object_id, a.user.identity.id)

	return {"data": {"watchers": watchers, "watching": watching}}

def action_watcher_add(a):
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

	# Watchers are stored locally since object_get checks the local DB
	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
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

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	# Watchers are stored locally since object_get checks the local DB
	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		a.error(404, "Object not found")
		return

	# Remove current user as watcher
	mochi.db.execute("delete from watchers where object=? and user=?", object_id, a.user.identity.id)

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

	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	views = mochi.db.rows(
		"select id, name, viewtype, filter, columns, rows, sort, direction, rank from views where project=? order by rank, name",
		project_id
	) or []

	# Add fields to each view
	for v in views:
		view_fields = mochi.db.rows("select field from view_fields where project=? and view=? order by rank", project_id, v["id"]) or []
		v["fields"] = ",".join([vf["field"] for vf in view_fields])

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
		return forward_to_owner(a, project_id, "view/create", {
			"project": project_id, "name": a.input("name"),
			"viewtype": a.input("viewtype") or "board",
			"filter": a.input("filter") or "",
			"columns": a.input("columns") or "",
			"rows": a.input("rows") or "",
			"fields": a.input("fields") or "title,priority,owner,due",
			"sort": a.input("sort") or "",
			"direction": a.input("direction") or "asc",
			"classes": a.input("classes") or "",
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
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
	existing = mochi.db.exists("select 1 from views where project=? and id=?", project_id, view_id)
	if existing:
		a.error(400, "A view with this name already exists")
		return

	filter_str = a.input("filter") or ""
	columns = a.input("columns") or ""
	if viewtype == "board" and not columns:
		a.error(400, "Columns field is required for board views")
		return
	rows = a.input("rows") or ""
	fields = a.input("fields") or "title,priority,owner,due"
	sort = a.input("sort") or ""
	direction = a.input("direction") or "asc"

	# Assign next rank
	next_rank = mochi.db.row("select coalesce(max(rank), -1) + 1 as r from views where project=?", project_id)
	rank = next_rank["r"] if next_rank else 0

	mochi.db.execute(
		"insert into views (project, id, name, viewtype, filter, columns, rows, sort, direction, rank) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, view_id, name.strip(), viewtype, filter_str, columns, rows, sort, direction, rank
	)

	# Add fields to junction table
	for i, field in enumerate(fields.split(",")):
		if field.strip():
			mochi.db.execute(
				"insert into view_fields (project, view, field, rank) values (?, ?, ?, ?)",
				project_id, view_id, field.strip(), i
			)

	# Add classes to junction table
	view_classes = a.input("classes") or ""
	if view_classes:
		for cls_id in [c.strip() for c in view_classes.split(",") if c.strip()]:
			mochi.db.execute(
				"insert into view_classes (project, view, class) values (?, ?, ?)",
				project_id, view_id, cls_id
			)

	broadcast_event(project_id, "view/create", {
		"project": project_id, "id": view_id, "name": name.strip(),
		"viewtype": viewtype, "filter": filter_str, "columns": columns,
		"rows": rows, "fields": fields, "sort": sort, "direction": direction
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
		params = {"project": project_id, "view": a.input("view")}
		for k in ["name", "viewtype", "filter", "columns", "rows", "fields", "sort", "direction", "classes"]:
			v = a.input(k)
			if v != None:
				params[k] = v
		return forward_to_owner(a, project_id, "view/update", params)

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	view_id = a.input("view")
	if not view_id:
		a.error(400, "View ID required")
		return

	view = mochi.db.row("select * from views where project=? and id=?", project_id, view_id)
	if not view:
		a.error(404, "View not found")
		return

	# Update fields if provided
	name = a.input("name")
	viewtype = a.input("viewtype")
	filter_str = a.input("filter")
	columns = a.input("columns")
	rows = a.input("rows")
	fields = a.input("fields")
	sort = a.input("sort")
	direction = a.input("direction")

	if name != None and name.strip() != "":
		mochi.db.execute("update views set name=? where project=? and id=?", name.strip(), project_id, view_id)
	if viewtype != None and viewtype != "":
		if viewtype not in ["board", "list"]:
			a.error(400, "Invalid view type")
			return
		mochi.db.execute("update views set viewtype=? where project=? and id=?", viewtype, project_id, view_id)
	if filter_str != None:
		mochi.db.execute("update views set filter=? where project=? and id=?", filter_str, project_id, view_id)
	if columns != None:
		mochi.db.execute("update views set columns=? where project=? and id=?", columns, project_id, view_id)
	if rows != None:
		mochi.db.execute("update views set rows=? where project=? and id=?", rows, project_id, view_id)
	if fields != None:
		# Delete existing fields and insert new ones
		mochi.db.execute("delete from view_fields where project=? and view=?", project_id, view_id)
		for i, field in enumerate(fields.split(",")):
			if field.strip():
				mochi.db.execute(
					"insert into view_fields (project, view, field, rank) values (?, ?, ?, ?)",
					project_id, view_id, field.strip(), i
				)
	if sort != None:
		mochi.db.execute("update views set sort=? where project=? and id=?", sort, project_id, view_id)
	if direction != None and direction != "":
		if direction not in ["asc", "desc"]:
			a.error(400, "Invalid direction")
			return
		mochi.db.execute("update views set direction=? where project=? and id=?", direction, project_id, view_id)

	# Update view classes if provided (comma-separated list of class IDs, empty string = all classes)
	view_classes_input = a.input("classes")
	if view_classes_input != None:
		# Delete existing view classes
		mochi.db.execute("delete from view_classes where project=? and view=?", project_id, view_id)
		# Insert new view classes
		if view_classes_input:
			cls_ids = [c.strip() for c in view_classes_input.split(",") if c.strip()]
			for cls_id in cls_ids:
				mochi.db.execute(
					"insert into view_classes (project, view, class) values (?, ?, ?)",
					project_id, view_id, cls_id
				)

	# Read back updated view for broadcast
	updated = mochi.db.row("select * from views where project=? and id=?", project_id, view_id)
	if updated:
		# Get fields from junction table
		view_fields = mochi.db.rows("select field from view_fields where project=? and view=? order by rank", project_id, view_id) or []
		updated_fields = ",".join([vf["field"] for vf in view_fields])
		broadcast_event(project_id, "view/update", {
			"project": project_id, "id": view_id,
			"name": updated["name"], "viewtype": updated["viewtype"],
			"filter": updated["filter"], "columns": updated["columns"],
			"rows": updated["rows"], "fields": updated_fields,
			"sort": updated["sort"], "direction": updated["direction"],
			"rank": updated["rank"]
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
		return forward_to_owner(a, project_id, "view/delete", {
			"project": project_id, "view": a.input("view"),
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	view_id = a.input("view")
	if not view_id:
		a.error(400, "View ID required")
		return

	# Don't allow deleting the last view
	count = mochi.db.row("select count(*) as cnt from views where project=?", project_id)
	if count and count["cnt"] <= 1:
		a.error(400, "Cannot delete the last view")
		return

	mochi.db.execute("delete from view_fields where project=? and view=?", project_id, view_id)
	mochi.db.execute("delete from view_classes where project=? and view=?", project_id, view_id)
	mochi.db.execute("delete from views where project=? and id=?", project_id, view_id)

	broadcast_event(project_id, "view/delete", {"project": project_id, "id": view_id})

	return {"data": {"success": True}}

def action_view_reorder(a):
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
		return forward_to_owner(a, project_id, "view/reorder", {
			"project": project_id, "order": a.input("order") or "",
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	# Get order (comma-separated view IDs)
	order_str = a.input("order") or ""
	order = [v.strip() for v in order_str.split(",") if v.strip()]

	# Update rank for each view
	for i, view_id in enumerate(order):
		mochi.db.execute(
			"update views set rank=? where project=? and id=?",
			i, project_id, view_id
		)

	broadcast_event(project_id, "view/reorder", {"project": project_id, "order": order})

	return {"data": {"success": True}}


# ============================================================================
# Type Actions
# ============================================================================

def action_class_list(a):
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

	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	classes = mochi.db.rows("select id, name, rank from classes where project=? order by rank", project_id) or []

	return {"data": {"classes": classes}}

def action_class_create(a):
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
		return forward_to_owner(a, project_id, "class/create", {
			"project": project_id, "name": a.input("name"),
			"pull_requests": a.input("pull_requests") or "0",
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	name = a.input("name")
	if not name or not name.strip():
		a.error(400, "Name is required")
		return

	# Generate class ID from name
	class_id = name.strip().lower().replace(" ", "_")

	# Check if ID already exists
	existing = mochi.db.exists("select 1 from classes where project=? and id=?", project_id, class_id)
	if existing:
		a.error(400, "A class with this name already exists")
		return

	# Get max rank
	max_rank = mochi.db.row("select max(rank) as m from classes where project=?", project_id)
	rank = (max_rank["m"] or 0) + 1 if max_rank else 0

	pr_flag = 1 if a.input("pull_requests") == "1" else 0

	mochi.db.execute(
		"insert into classes (project, id, name, rank, pull_requests) values (?, ?, ?, ?, ?)",
		project_id, class_id, name.strip(), rank, pr_flag
	)

	# Add default title field
	mochi.db.execute(
		"insert into fields (project, class, id, name, fieldtype, required, rank) values (?, ?, ?, ?, ?, ?, ?)",
		project_id, class_id, "title", "Title", "text", 1, 0
	)

	# Set hierarchy to allow root by default
	mochi.db.execute(
		"insert into hierarchy (project, class, parent) values (?, ?, ?)",
		project_id, class_id, ""
	)

	broadcast_event(project_id, "class/create", {
		"project": project_id, "id": class_id, "name": name.strip(), "rank": rank, "pull_requests": pr_flag
	})

	return {"data": {"id": class_id, "name": name.strip(), "rank": rank}}

def action_class_update(a):
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
		params = {"project": project_id, "class": a.input("class")}
		n = a.input("name")
		if n:
			params["name"] = n
		pr = a.input("pull_requests")
		if pr:
			params["pull_requests"] = pr
		return forward_to_owner(a, project_id, "class/update", params)

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	if not class_id:
		a.error(400, "Type ID required")
		return

	class_row = mochi.db.row("select * from classes where project=? and id=?", project_id, class_id)
	if not class_row:
		a.error(404, "Class not found")
		return

	name = a.input("name")
	if name:
		mochi.db.execute("update classes set name=? where project=? and id=?", name.strip(), project_id, class_id)

	pr_input = a.input("pull_requests")
	if pr_input:
		pr_flag = 1 if pr_input == "1" else 0
		mochi.db.execute("update classes set pull_requests=? where project=? and id=?", pr_flag, project_id, class_id)

	broadcast_event(project_id, "class/update", {
		"project": project_id, "id": class_id, "name": name or class_row["name"],
		"pull_requests": class_row["pull_requests"] if not pr_input else (1 if pr_input == "1" else 0)
	})

	return {"data": {"success": True}}

def action_class_delete(a):
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
		return forward_to_owner(a, project_id, "class/delete", {
			"project": project_id, "class": a.input("class"),
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	if not class_id:
		a.error(400, "Class ID required")
		return

	# Check if there are objects of this class
	has_objects = mochi.db.exists("select 1 from objects where project=? and class=?", project_id, class_id)
	if has_objects:
		a.error(400, "Cannot delete class with existing objects")
		return

	# Delete in order: options, fields, hierarchy, class
	mochi.db.execute("delete from options where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from fields where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from hierarchy where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from classes where project=? and id=?", project_id, class_id)

	broadcast_event(project_id, "class/delete", {"project": project_id, "id": class_id})

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

	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	if not class_id:
		a.error(400, "Type ID required")
		return

	parents = mochi.db.rows("select parent from hierarchy where project=? and class=?", project_id, class_id) or []
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
		return forward_to_owner(a, project_id, "hierarchy/set", {
			"project": project_id, "class": a.input("class"),
			"parents": a.input("parents"),
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	if not class_id:
		a.error(400, "Type ID required")
		return

	class_row = mochi.db.row("select id from classes where project=? and id=?", project_id, class_id)
	if not class_row:
		a.error(404, "Type not found")
		return

	# Get parents list (comma-separated)
	# Empty string in list means "can be root" (no parent required)
	# "_none_" means no parents allowed (empty list)
	parents_str = a.input("parents")
	if parents_str == None or parents_str == "_none_":
		parents = []
	elif parents_str == "":
		# Empty string input means "can be root"
		parents = [""]
	else:
		parents = [p.strip() for p in parents_str.split(",")]

	# Delete existing hierarchy
	mochi.db.execute("delete from hierarchy where project=? and class=?", project_id, class_id)

	# Insert new hierarchy entries
	for parent in parents:
		# Verify parent class exists (unless it's empty string for root)
		if parent and parent != "":
			parent_exists = mochi.db.exists("select 1 from classes where project=? and id=?", project_id, parent)
			if not parent_exists:
				continue  # Skip invalid parents
		mochi.db.execute(
			"insert into hierarchy (project, class, parent) values (?, ?, ?)",
			project_id, class_id, parent
		)

	broadcast_event(project_id, "hierarchy/set", {
		"project": project_id, "class": class_id, "parents": parents
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

	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	if not class_id:
		a.error(400, "Class ID required")
		return

	fields = mochi.db.rows(
		"select id, name, fieldtype, required, multi, rank, min, max, pattern, minlength, maxlength, prefix, suffix, format, card, position, rows from fields where project=? and class=? order by rank",
		project_id, class_id
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
		return forward_to_owner(a, project_id, "field/create", {
			"project": project_id, "class": a.input("class"),
			"name": a.input("name"), "fieldtype": a.input("fieldtype") or "text",
			"required": a.input("required") or "0", "multi": a.input("multi") or "0",
			"card": a.input("card") or "1", "rows": a.input("rows") or "1",
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	if not class_id:
		a.error(400, "Type ID required")
		return

	class_row = mochi.db.row("select id from classes where project=? and id=?", project_id, class_id)
	if not class_row:
		a.error(404, "Type not found")
		return

	name = a.input("name")
	if not name or not name.strip():
		a.error(400, "Name is required")
		return

	fieldtype = a.input("fieldtype") or "text"
	if fieldtype not in ["text", "number", "date", "enumerated", "user", "object", "checkbox", "checklist"]:
		a.error(400, "Invalid field type")
		return

	# Generate field ID from name
	field_id = name.strip().lower().replace(" ", "_")

	# Check if ID already exists
	existing = mochi.db.exists("select 1 from fields where project=? and class=? and id=?", project_id, class_id, field_id)
	if existing:
		a.error(400, "A field with this name already exists")
		return

	# Get max rank
	max_rank = mochi.db.row("select max(rank) as m from fields where project=? and class=?", project_id, class_id)
	rank = (max_rank["m"] or 0) + 1 if max_rank else 0

	required = 1 if a.input("required") == "1" or a.input("required") == "true" else 0
	multi = 1 if a.input("multi") == "1" or a.input("multi") == "true" else 0
	card = 1 if a.input("card") != "0" and a.input("card") != "false" else 0
	rows = int(a.input("rows")) if a.input("rows") else 1

	mochi.db.execute(
		"insert into fields (project, class, id, name, fieldtype, required, multi, rank, card, rows) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, class_id, field_id, name.strip(), fieldtype, required, multi, rank, card, rows
	)

	broadcast_event(project_id, "field/create", {
		"project": project_id, "class": class_id, "id": field_id,
		"name": name.strip(), "fieldtype": fieldtype, "required": required,
		"multi": multi, "rank": rank, "card": card, "rows": rows
	})

	return {"data": {"id": field_id, "name": name.strip(), "fieldtype": fieldtype, "rank": rank}}

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
		params = {"project": project_id, "class": a.input("class"), "field": a.input("field")}
		for k in ["name", "required", "multi", "card", "position", "rows"]:
			v = a.input(k)
			if v != None:
				params[k] = v
		return forward_to_owner(a, project_id, "field/update", params)

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	field_id = a.input("field")
	if not class_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	field_row = mochi.db.row("select * from fields where project=? and class=? and id=?", project_id, class_id, field_id)
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
	rows_val = a.input("rows")

	if name != None:
		mochi.db.execute("update fields set name=? where project=? and class=? and id=?", name.strip(), project_id, class_id, field_id)
	if required != None:
		req_val = 1 if required == "1" or required == "true" else 0
		mochi.db.execute("update fields set required=? where project=? and class=? and id=?", req_val, project_id, class_id, field_id)
	if multi != None:
		multi_val = 1 if multi == "1" or multi == "true" else 0
		mochi.db.execute("update fields set multi=? where project=? and class=? and id=?", multi_val, project_id, class_id, field_id)
	if card != None:
		card_val = 1 if card == "1" or card == "true" else 0
		mochi.db.execute("update fields set card=? where project=? and class=? and id=?", card_val, project_id, class_id, field_id)
	if min_val != None:
		mochi.db.execute("update fields set min=? where project=? and class=? and id=?", min_val, project_id, class_id, field_id)
	if max_val != None:
		mochi.db.execute("update fields set max=? where project=? and class=? and id=?", max_val, project_id, class_id, field_id)
	if pattern != None:
		mochi.db.execute("update fields set pattern=? where project=? and class=? and id=?", pattern, project_id, class_id, field_id)
	if minlength != None:
		mochi.db.execute("update fields set minlength=? where project=? and class=? and id=?", int(minlength), project_id, class_id, field_id)
	if maxlength != None:
		mochi.db.execute("update fields set maxlength=? where project=? and class=? and id=?", int(maxlength), project_id, class_id, field_id)
	if prefix != None:
		mochi.db.execute("update fields set prefix=? where project=? and class=? and id=?", prefix, project_id, class_id, field_id)
	if suffix != None:
		mochi.db.execute("update fields set suffix=? where project=? and class=? and id=?", suffix, project_id, class_id, field_id)
	if format_str != None:
		mochi.db.execute("update fields set format=? where project=? and class=? and id=?", format_str, project_id, class_id, field_id)
	if position != None:
		mochi.db.execute("update fields set position=? where project=? and class=? and id=?", position, project_id, class_id, field_id)
	if rows_val != None:
		mochi.db.execute("update fields set rows=? where project=? and class=? and id=?", int(rows_val), project_id, class_id, field_id)

	# Build update data from provided fields
	update_data = {"project": project_id, "class": class_id, "id": field_id}
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
	if rows_val != None:
		update_data["rows"] = int(rows_val)
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
		return forward_to_owner(a, project_id, "field/delete", {
			"project": project_id, "class": a.input("class"),
			"field": a.input("field"),
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	field_id = a.input("field")
	if not class_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	# Delete options for this field
	mochi.db.execute("delete from options where project=? and class=? and field=?", project_id, class_id, field_id)

	# Delete field
	mochi.db.execute("delete from fields where project=? and class=? and id=?", project_id, class_id, field_id)

	broadcast_event(project_id, "field/delete", {"project": project_id, "class": class_id, "id": field_id})

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
		return forward_to_owner(a, project_id, "field/reorder", {
			"project": project_id, "class": a.input("class"),
			"order": a.input("order") or "",
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	if not class_id:
		a.error(400, "Type ID required")
		return

	# Get order (comma-separated field IDs)
	order_str = a.input("order") or ""
	order = [f.strip() for f in order_str.split(",") if f.strip()]

	# Update rank for each field
	for i, field_id in enumerate(order):
		mochi.db.execute(
			"update fields set rank=? where project=? and class=? and id=?",
			i, project_id, class_id, field_id
		)

	broadcast_event(project_id, "field/reorder", {"project": project_id, "class": class_id, "order": order})

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

	if project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	field_id = a.input("field")
	if not class_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	options = mochi.db.rows(
		"select id, name, colour, icon, rank from options where project=? and class=? and field=? order by rank",
		project_id, class_id, field_id
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
		return forward_to_owner(a, project_id, "option/create", {
			"project": project_id, "class": a.input("class"),
			"field": a.input("field"), "name": a.input("name"),
			"colour": a.input("colour") or "#94a3b8",
			"icon": a.input("icon") or "",
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	field_id = a.input("field")
	if not class_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	# Verify field exists and is enumerated
	field_row = mochi.db.row("select fieldtype from fields where project=? and class=? and id=?", project_id, class_id, field_id)
	if not field_row:
		a.error(404, "Field not found")
		return
	if field_row["fieldtype"] != "enumerated":
		a.error(400, "Options can only be added to enumerated fields")
		return

	name = a.input("name")
	if not name or not name.strip():
		a.error(400, "Name is required")
		return

	# Generate option ID from name
	option_id = name.strip().lower().replace(" ", "_")

	# Check if ID already exists
	existing = mochi.db.exists("select 1 from options where project=? and class=? and field=? and id=?", project_id, class_id, field_id, option_id)
	if existing:
		a.error(400, "An option with this name already exists")
		return

	# Get max rank
	max_rank = mochi.db.row("select max(rank) as m from options where project=? and class=? and field=?", project_id, class_id, field_id)
	rank = (max_rank["m"] or 0) + 1 if max_rank else 0

	colour = a.input("colour") or "#94a3b8"
	icon = a.input("icon") or ""

	mochi.db.execute(
		"insert into options (project, class, field, id, name, colour, icon, rank) values (?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, class_id, field_id, option_id, name.strip(), colour, icon, rank
	)

	broadcast_event(project_id, "option/create", {
		"project": project_id, "class": class_id, "field": field_id,
		"id": option_id, "name": name.strip(), "colour": colour, "icon": icon, "rank": rank
	})

	return {"data": {"id": option_id, "name": name.strip(), "colour": colour, "rank": rank}}

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
		params = {"project": project_id, "class": a.input("class"),
				  "field": a.input("field"), "option": a.input("option")}
		for k in ["name", "colour", "icon"]:
			v = a.input(k)
			if v != None:
				params[k] = v
		return forward_to_owner(a, project_id, "option/update", params)

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	field_id = a.input("field")
	option_id = a.input("option")
	if not class_id or not field_id or not option_id:
		a.error(400, "Type, field, and option ID required")
		return

	option_row = mochi.db.row("select * from options where project=? and class=? and field=? and id=?", project_id, class_id, field_id, option_id)
	if not option_row:
		a.error(404, "Option not found")
		return

	name = a.input("name")
	colour = a.input("colour")
	icon = a.input("icon")

	if name != None:
		mochi.db.execute("update options set name=? where project=? and class=? and field=? and id=?", name.strip(), project_id, class_id, field_id, option_id)
	if colour != None:
		mochi.db.execute("update options set colour=? where project=? and class=? and field=? and id=?", colour, project_id, class_id, field_id, option_id)
	if icon != None:
		mochi.db.execute("update options set icon=? where project=? and class=? and field=? and id=?", icon, project_id, class_id, field_id, option_id)

	update_data = {"project": project_id, "class": class_id, "field": field_id, "id": option_id}
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
		return forward_to_owner(a, project_id, "option/delete", {
			"project": project_id, "class": a.input("class"),
			"field": a.input("field"), "option": a.input("option"),
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	field_id = a.input("field")
	option_id = a.input("option")
	if not class_id or not field_id or not option_id:
		a.error(400, "Type, field, and option ID required")
		return

	mochi.db.execute("delete from options where project=? and class=? and field=? and id=?", project_id, class_id, field_id, option_id)

	broadcast_event(project_id, "option/delete", {"project": project_id, "class": class_id, "field": field_id, "id": option_id})

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
		return forward_to_owner(a, project_id, "option/reorder", {
			"project": project_id, "class": a.input("class"),
			"field": a.input("field"), "order": a.input("order") or "",
		})

	if not check_project_access(a.user.identity.id, project_id, "design"):
		a.error(403, "Access denied")
		return

	class_id = a.input("class")
	field_id = a.input("field")
	if not class_id or not field_id:
		a.error(400, "Type and field ID required")
		return

	# Get order (comma-separated option IDs)
	order_str = a.input("order") or ""
	order = [o.strip() for o in order_str.split(",") if o.strip()]

	# Update sort order for each option
	for i, option_id in enumerate(order):
		mochi.db.execute(
			"update options set rank=? where project=? and class=? and field=? and id=?",
			i, project_id, class_id, field_id, option_id
		)

	broadcast_event(project_id, "option/reorder", {"project": project_id, "class": class_id, "field": field_id, "order": order})

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

	result = mochi.service.call("repositories", "merge/check", {
		"repo": repo_id,
		"source": source,
		"target": target
	})

	if result == None:
		return {"data": {"can_merge": False, "error": "Could not check merge status"}}
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

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if not project:
		a.error(404, "Project not found")
		return

	repo_id = a.input("repo")
	source = a.input("source")
	target = a.input("target")
	message = a.input("message") or "Merge branch"
	method = a.input("method") or "merge"

	if not repo_id or not source or not target:
		a.error(400, "Repository, source, and target required")
		return

	if project["owner"] == 1:
		if not check_project_access(a.user.identity.id, project_id, "write"):
			a.error(403, "Access denied")
			return
		# Owner: merge directly via local service
		result = mochi.service.call("repositories", "merge", {
			"repo": repo_id,
			"source": source,
			"target": target,
			"message": message,
			"method": method,
			"author_name": a.user.identity.name,
			"author_email": a.user.username,
		})
		if result == None:
			a.error(500, "Repositories service unavailable")
			return
		return {"data": result}
	else:
		# Subscriber: check local access, then send P2P request to owner
		if not mochi.access.check(a.user.identity.id, "project/" + project_id, "write"):
			a.error(403, "Write access required to merge")
			return

		result = mochi.remote.request(project_id, "projects", "merge/request", {
			"project": project_id,
			"repo": repo_id,
			"source": source,
			"target": target,
			"message": message,
			"method": method,
			"author_name": a.user.identity.name,
			"author_email": a.user.username,
		})
		if not result:
			a.error(502, "Could not reach project owner")
			return
		if result.get("error"):
			a.error(result.get("code", 500), result["error"])
			return
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
# Notification Actions
# ============================================================================

def action_notifications_subscribe(a):
	"""Create a notification subscription via the notifications service."""
	label = a.input("label", "").strip()
	type = a.input("type", "").strip()
	object = a.input("object", "").strip()
	destinations = a.input("destinations", "")

	if not label:
		a.error(400, "label is required")
		return
	if not mochi.valid(label, "text"):
		a.error(400, "Invalid label")
		return

	destinations_list = json.decode(destinations) if destinations else []

	result = mochi.service.call("notifications", "subscribe", label, type, object, destinations_list)
	return {"data": {"id": result}}

def action_notifications_check(a):
	"""Check if a notification subscription exists for this app."""
	result = mochi.service.call("notifications", "subscriptions")
	return {"data": {"exists": len(result) > 0}}

def action_notifications_destinations(a):
	"""List available notification destinations."""
	result = mochi.service.call("notifications", "destinations")
	return {"data": result}


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
	schema = None
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
		# Fetch schema so it is available before the frontend navigates
		schema = mochi.remote.request(project_id, "projects", "schema", {}, peer)
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

	# Insert schema so the project page has content immediately
	if schema and not schema.get("error"):
		insert_schema(project_id, schema)

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
	mochi.db.execute("delete from classes where project=?", project_id)
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

	requester = e.header("from")
	if project["owner"] == 1 and not check_project_access(requester, project_id, "view"):
		e.stream.write({"error": "Access denied"})
		return

	e.stream.write({
		"id": entity["id"],
		"name": project["name"],
		"description": project["description"],
		"prefix": project["prefix"],
		"fingerprint": entity.get("fingerprint", mochi.entity.fingerprint(project_id)),
	})

# Return the full project schema (classes, fields, options, hierarchy, views)
def event_schema(e):
	project_id = e.header("to")
	project = mochi.db.row("select id from projects where id=? and owner=1", project_id)
	if not project:
		e.stream.write({"error": "Project not found"})
		return

	requester = e.header("from")
	if not check_project_access(requester, project_id, "view"):
		e.stream.write({"error": "Access denied"})
		return

	# Classes
	classes = mochi.db.rows("select id, name, rank, pull_requests from classes where project=?", project_id) or []

	# Fields with class context
	fields = []
	for c in classes:
		class_fields = mochi.db.rows("select id, name, fieldtype, required, multi, rank, card, position, rows from fields where project=? and class=? order by rank", project_id, c["id"]) or []
		for f in class_fields:
			f["class"] = c["id"]
			fields.append(f)

	# Options with class and field context
	options = []
	for c in classes:
		for f in (mochi.db.rows("select id, fieldtype from fields where project=? and class=?", project_id, c["id"]) or []):
			if f["fieldtype"] == "enumerated":
				field_options = mochi.db.rows("select id, name, colour, icon, rank from options where project=? and class=? and field=? order by rank", project_id, c["id"], f["id"]) or []
				for o in field_options:
					o["class"] = c["id"]
					o["field"] = f["id"]
					options.append(o)

	# Hierarchy
	hierarchy = []
	for c in classes:
		parents = mochi.db.rows("select parent from hierarchy where project=? and class=?", project_id, c["id"]) or []
		if parents:
			hierarchy.append({"class": c["id"], "parents": [p["parent"] for p in parents]})

	# Views with fields and classes
	views = []
	for v in (mochi.db.rows("select id, name, viewtype, filter, columns, rows, sort, direction, rank from views where project=? order by rank, name", project_id) or []):
		view_fields = mochi.db.rows("select field from view_fields where project=? and view=? order by rank", project_id, v["id"]) or []
		view_classes = mochi.db.rows("select class from view_classes where project=? and view=?", project_id, v["id"]) or []
		v["fields"] = ",".join([vf["field"] for vf in view_fields])
		v["classes"] = ",".join([vc["class"] for vc in view_classes])
		views.append(v)

	# Objects with values
	objects = []
	for obj in (mochi.db.rows("select id, class, number, parent, rank, created, updated from objects where project=?", project_id) or []):
		vals = mochi.db.rows("select field, value from \"values\" where object=?", obj["id"])
		if vals:
			values_map = {}
			for v in vals:
				values_map[v["field"]] = v["value"]
			obj["values"] = values_map
		objects.append(obj)

	e.stream.write({
		"classes": classes,
		"fields": fields,
		"options": options,
		"hierarchy": hierarchy,
		"views": views,
		"objects": objects,
	})

# Insert project schema and objects into local database
def insert_schema(project_id, schema):
	for c in (schema.get("classes") or []):
		mochi.db.execute(
			"insert or ignore into classes (id, project, name, rank, pull_requests) values (?, ?, ?, ?, ?)",
			c.get("id", ""), project_id, c.get("name", ""), c.get("rank", 0), c.get("pull_requests", 0)
		)
	for f in (schema.get("fields") or []):
		mochi.db.execute(
			"insert or ignore into fields (project, class, id, name, fieldtype, required, multi, rank, card, position, rows) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			project_id, f.get("class", ""), f.get("id", ""), f.get("name", ""),
			f.get("fieldtype", "text"), f.get("required", 0), f.get("multi", 0),
			f.get("rank", 0), f.get("card", 1), f.get("position", ""), f.get("rows", 1)
		)
	for o in (schema.get("options") or []):
		mochi.db.execute(
			"insert or ignore into options (project, class, field, id, name, colour, icon, rank) values (?, ?, ?, ?, ?, ?, ?, ?)",
			project_id, o.get("class", ""), o.get("field", ""), o.get("id", ""),
			o.get("name", ""), o.get("colour", "#94a3b8"), o.get("icon", ""), o.get("rank", 0)
		)
	for h in (schema.get("hierarchy") or []):
		for parent in (h.get("parents") or []):
			mochi.db.execute(
				"insert or ignore into hierarchy (project, class, parent) values (?, ?, ?)",
				project_id, h.get("class", ""), parent
			)
	for v in (schema.get("views") or []):
		view_id = v.get("id", "")
		mochi.db.execute(
			"insert or ignore into views (id, project, name, viewtype, filter, columns, rows, sort, direction, rank) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			view_id, project_id, v.get("name", ""), v.get("viewtype", "board"),
			v.get("filter", ""), v.get("columns", ""), v.get("rows", ""),
			v.get("sort", ""), v.get("direction", "asc"), v.get("rank", 0)
		)
		fields_csv = v.get("fields", "")
		if fields_csv:
			rank = 0
			for field_id in fields_csv.split(","):
				if field_id:
					mochi.db.execute("insert or ignore into view_fields (project, view, field, rank) values (?, ?, ?, ?)", project_id, view_id, field_id, rank)
					rank += 1
		classes_csv = v.get("classes", "")
		if classes_csv:
			for class_id in classes_csv.split(","):
				if class_id:
					mochi.db.execute("insert or ignore into view_classes (project, view, class) values (?, ?, ?)", project_id, view_id, class_id)
	for obj in (schema.get("objects") or []):
		mochi.db.execute(
			"insert or ignore into objects (id, project, class, number, parent, rank, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?)",
			obj.get("id", ""), project_id, obj.get("class", ""),
			obj.get("number", 0), obj.get("parent", ""), obj.get("rank", 0),
			obj.get("created", 0), obj.get("updated", 0)
		)
		values = obj.get("values")
		if values:
			for field in values:
				mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", obj.get("id", ""), field, values[field])

# Send all existing project data to a new subscriber
def send_project_data(project_id, subscriber_id):
	h = p2p_headers(project_id, subscriber_id, "")

	# Send classes
	types = mochi.db.rows("select * from classes where project=?", project_id)
	for t in types:
		h["event"] = "class/create"
		mochi.message.send(h, {"project": project_id, "id": t["id"], "name": t["name"], "rank": t["rank"], "pull_requests": t["pull_requests"]})

		# Send hierarchy for this class
		parents = mochi.db.rows("select parent from hierarchy where project=? and class=?", project_id, t["id"])
		if parents:
			h["event"] = "hierarchy/set"
			mochi.message.send(h, {"project": project_id, "class": t["id"], "parents": [p["parent"] for p in parents]})

		# Send fields for this class
		fields = mochi.db.rows("select * from fields where project=? and class=? order by rank", project_id, t["id"])
		for f in fields:
			h["event"] = "field/create"
			mochi.message.send(h, {
				"project": project_id, "class": t["id"], "id": f["id"], "name": f["name"],
				"fieldtype": f["fieldtype"], "required": f["required"], "multi": f["multi"],
				"rank": f["rank"], "card": f["card"], "position": f["position"], "rows": f["rows"]
			})

			# Send options for enumerated fields
			options = mochi.db.rows("select * from options where project=? and class=? and field=? order by rank", project_id, t["id"], f["id"])
			for o in options:
				h["event"] = "option/create"
				mochi.message.send(h, {
					"project": project_id, "class": t["id"], "field": f["id"],
					"id": o["id"], "name": o["name"], "colour": o["colour"], "icon": o["icon"], "rank": o["rank"]
				})

	# Send views
	views = mochi.db.rows("select * from views where project=?", project_id)
	for v in views:
		# Get view fields and classes
		view_fields = mochi.db.rows("select field from view_fields where project=? and view=? order by rank", project_id, v["id"]) or []
		fields_csv = ",".join([vf["field"] for vf in view_fields])
		view_classes = mochi.db.rows("select class from view_classes where project=? and view=?", project_id, v["id"]) or []
		classes_csv = ",".join([vc["class"] for vc in view_classes])
		h["event"] = "view/create"
		mochi.message.send(h, {
			"project": project_id, "id": v["id"], "name": v["name"], "viewtype": v["viewtype"],
			"filter": v["filter"], "columns": v["columns"], "rows": v["rows"],
			"sort": v["sort"], "direction": v["direction"], "rank": v["rank"],
			"fields": fields_csv, "classes": classes_csv
		})

	# Send objects with their values, comments, and links
	objects = mochi.db.rows("select * from objects where project=?", project_id)
	for obj in objects:
		h["event"] = "object/create"
		mochi.message.send(h, {
			"project": project_id, "id": obj["id"], "class": obj["class"],
			"number": obj["number"], "parent": obj["parent"], "rank": obj["rank"],
			"created": obj["created"], "updated": obj["updated"], "sync": True
		})

		# Send values for this object
		vals = mochi.db.rows("select field, value from \"values\" where object=?", obj["id"])
		if vals:
			values_map = {}
			for v in vals:
				values_map[v["field"]] = v["value"]
			h["event"] = "values/update"
			mochi.message.send(h, {"project": project_id, "id": obj["id"], "values": values_map, "sync": True})

		# Send comments for this object
		comments = mochi.db.rows("select * from comments where object=? order by created", obj["id"])
		for c in comments:
			h["event"] = "comment/create"
			mochi.message.send(h, {
				"project": project_id, "id": c["id"], "object": obj["id"],
				"author": c["author"], "name": c["name"], "content": c["content"], "created": c["created"],
				"sync": True
			})

	# Send links (once, not per-object)
	links = mochi.db.rows("select l.source, l.target, l.linktype from links l join objects o on l.source = o.id where o.project=?", project_id)
	for l in links:
		h["event"] = "link/create"
		mochi.message.send(h, {"project": project_id, "source": l["source"], "target": l["target"], "linktype": l["linktype"], "sync": True})

# Handle subscribe event from a remote user
def event_subscribe(e):
	project_id = e.header("to")

	project = mochi.db.row("select * from projects where id=? and owner=1", project_id)
	if not project:
		return

	subscriber_id = e.header("from")
	if not mochi.valid(subscriber_id, "entity"):
		return

	# Check subscriber has at least view access
	if not check_project_access(subscriber_id, project_id, "view"):
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
	mochi.db.execute("delete from classes where project=?", project_id)
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
		"insert or ignore into objects (id, project, class, number, parent, rank, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?)",
		e.content("id"), project_id, e.content("class") or "",
		e.content("number") or 0, e.content("parent") or "", e.content("rank") or 0,
		e.content("created") or mochi.time.now(), e.content("updated") or mochi.time.now()
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
	class_id = e.content("class")
	parent = e.content("parent")
	rank = e.content("rank")
	if class_id:
		mochi.db.execute("update objects set class=? where id=? and project=?", class_id, object_id, project_id)
	if parent:
		mochi.db.execute("update objects set parent=? where id=? and project=?", parent, object_id, project_id)
	if rank:
		mochi.db.execute("update objects set rank=? where id=? and project=?", rank, object_id, project_id)
	mochi.db.execute("update objects set updated=? where id=? and project=?", mochi.time.now(), object_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "object/update", "project": project_id, "id": object_id})
	# Notify local user if watching
	if not e.content("sync"):
		actor = e.content("actor") or ""
		local_id = e.header("to")
		if local_id:
			notify_watchers(object_id, project_id, local_id, actor, "updated", "Object modified")

# Object deleted
def event_object_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	object_id = e.content("id")
	if not object_id:
		return
	# Notify local user before deleting watchers
	actor = e.content("actor") or ""
	local_id = e.header("to")
	if local_id:
		notify_watchers(object_id, project_id, local_id, actor, "deleted", "Object deleted")
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
	# Notify local user if watching
	if not e.content("sync"):
		actor = e.content("actor") or ""
		local_id = e.header("to")
		if local_id:
			notify_watchers(object_id, project_id, local_id, actor, "updated", "Fields changed")
			# Check for assignment notification
			obj_row = mochi.db.row("select class from objects where id=? and project=?", object_id, project_id)
			if obj_row:
				for field in values:
					if str(values[field]) == local_id:
						field_row = mochi.db.row(
							"select fieldtype from fields where project=? and class=? and id=?",
							project_id, obj_row["class"], field)
						if field_row and field_row["fieldtype"] == "user":
							project = get_project(project_id)
							if project:
								obj = mochi.db.row("select number from objects where id=?", object_id)
								readable = project["prefix"] + "-" + str(obj["number"]) if obj else ""
								fp2 = mochi.entity.fingerprint(project_id)
								url = "/projects/" + fp2 if fp2 else "/projects"
								mochi.service.call("notifications", "send", "assignment",
									readable + " assigned to you",
									"You were assigned to " + readable,
									object_id + "/assign", url)
							# Auto-watch on assignment
							mochi.db.execute(
								"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
								object_id, local_id, mochi.time.now())

# Comment created
def event_comment_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into comments (id, object, parent, author, name, content, created, edited) values (?, ?, ?, ?, ?, ?, ?, ?)",
		e.content("id"), e.content("object") or "", e.content("parent") or "",
		e.content("author") or "", e.content("name") or "",
		e.content("content") or "", e.content("created") or mochi.time.now(), 0
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "comment/create", "project": project_id, "object": e.content("object")})
	# Notify local user if watching
	if not e.content("sync"):
		actor = e.content("actor") or ""
		local_id = e.header("to")
		object_id = e.content("object")
		if object_id and local_id:
			name = e.content("name") or "Someone"
			excerpt = (e.content("content") or "")[:80]
			notify_watchers(object_id, project_id, local_id, actor, name + ": " + excerpt, name + ": " + excerpt)

# Comment updated
def event_comment_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	comment_id = e.content("id")
	if not comment_id:
		return
	content = e.content("content")
	if content:
		mochi.db.execute("update comments set content=?, edited=? where id=?", content, mochi.time.now(), comment_id)
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
		"insert or ignore into links (project, source, target, linktype, created) values (?, ?, ?, ?, ?)",
		project_id, e.content("source") or "", e.content("target") or "",
		e.content("linktype") or "related", e.content("created") or mochi.time.now()
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "link/create", "project": project_id})
	# Notify local user if watching
	if not e.content("sync"):
		actor = e.content("actor") or ""
		local_id = e.header("to")
		source = e.content("source")
		if source and local_id:
			notify_watchers(source, project_id, local_id, actor, "linked", "Link added")

# Link deleted
def event_link_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"delete from links where source=? and target=? and linktype=?",
		e.content("source") or "", e.content("target") or "", e.content("linktype") or "related"
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "link/delete", "project": project_id})

# View created
def event_view_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	view_id = e.content("id")
	if not view_id:
		return
	mochi.db.execute(
		"insert or ignore into views (id, project, name, viewtype, filter, columns, rows, sort, direction, rank) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		view_id, project_id, e.content("name") or "", e.content("viewtype") or "board",
		e.content("filter") or "", e.content("columns") or "", e.content("rows") or "",
		e.content("sort") or "", e.content("direction") or "asc", e.content("rank") or 0
	)
	# Sync view fields
	fields_csv = e.content("fields") or ""
	if fields_csv:
		rank = 0
		for field_id in fields_csv.split(","):
			if field_id:
				mochi.db.execute("insert or ignore into view_fields (project, view, field, rank) values (?, ?, ?, ?)", project_id, view_id, field_id, rank)
				rank += 1
	# Sync view classes
	classes_csv = e.content("classes") or ""
	if classes_csv:
		for class_id in classes_csv.split(","):
			if class_id:
				mochi.db.execute("insert or ignore into view_classes (project, view, class) values (?, ?, ?)", project_id, view_id, class_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "view/create", "project": project_id, "id": view_id})

# View updated
def event_view_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	view_id = e.content("id")
	if not view_id:
		return
	name = e.content("name")
	viewtype = e.content("viewtype")
	filter_val = e.content("filter")
	columns = e.content("columns")
	rows = e.content("rows")
	sort = e.content("sort")
	direction = e.content("direction")
	if name:
		mochi.db.execute("update views set name=? where id=? and project=?", name, view_id, project_id)
	if viewtype:
		mochi.db.execute("update views set viewtype=? where id=? and project=?", viewtype, view_id, project_id)
	if filter_val:
		mochi.db.execute("update views set filter=? where id=? and project=?", filter_val, view_id, project_id)
	if columns:
		mochi.db.execute("update views set columns=? where id=? and project=?", columns, view_id, project_id)
	if rows:
		mochi.db.execute("update views set rows=? where id=? and project=?", rows, view_id, project_id)
	if sort:
		mochi.db.execute("update views set sort=? where id=? and project=?", sort, view_id, project_id)
	if direction:
		mochi.db.execute("update views set direction=? where id=? and project=?", direction, view_id, project_id)
	# Sync view fields if provided
	fields_csv = e.content("fields")
	if fields_csv:
		mochi.db.execute("delete from view_fields where project=? and view=?", project_id, view_id)
		rank = 0
		for field_id in fields_csv.split(","):
			if field_id:
				mochi.db.execute("insert into view_fields (project, view, field, rank) values (?, ?, ?, ?)", project_id, view_id, field_id, rank)
				rank += 1
	# Sync view classes if provided
	classes_csv = e.content("classes")
	if classes_csv:
		mochi.db.execute("delete from view_classes where project=? and view=?", project_id, view_id)
		for class_id in classes_csv.split(","):
			if class_id:
				mochi.db.execute("insert into view_classes (project, view, class) values (?, ?, ?)", project_id, view_id, class_id)
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
def event_class_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into classes (id, project, name, rank, pull_requests) values (?, ?, ?, ?, ?)",
		e.content("id"), project_id, e.content("name") or "",
		e.content("rank") or 0, e.content("pull_requests") or 0
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "class/create", "project": project_id, "id": e.content("id")})

# Type updated
def event_class_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("id")
	if not class_id:
		return
	name = e.content("name")
	if name != None:
		mochi.db.execute("update classes set name=? where id=? and project=?", name, class_id, project_id)
	pr = e.content("pull_requests")
	if pr != None:
		mochi.db.execute("update classes set pull_requests=? where id=? and project=?", pr, class_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "class/update", "project": project_id, "id": class_id})

# Class deleted
def event_class_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("id")
	if not class_id:
		return
	mochi.db.execute("delete from options where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from fields where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from hierarchy where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from classes where id=? and project=?", class_id, project_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "class/delete", "project": project_id, "id": class_id})

# Hierarchy set
def event_hierarchy_set(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("class")
	parents = e.content("parents")
	if not class_id:
		return
	# Clear existing hierarchy for this class
	mochi.db.execute("delete from hierarchy where project=? and class=?", project_id, class_id)
	# Insert new parents
	if parents:
		for parent in parents:
			mochi.db.execute(
				"insert into hierarchy (project, class, parent) values (?, ?, ?)",
				project_id, class_id, parent
			)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "hierarchy/set", "project": project_id, "class": class_id})

# Field created
def event_field_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into fields (project, class, id, name, fieldtype, required, multi, rank, card, position, rows) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, e.content("class") or "", e.content("id") or "", e.content("name") or "",
		e.content("fieldtype") or "text", e.content("required") or 0, e.content("multi") or 0,
		e.content("rank") or 0, e.content("card") or 1, e.content("position") or "", e.content("rows") or 1
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "field/create", "project": project_id, "class_id": e.content("class"), "id": e.content("id")})

# Field updated
def event_field_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("class")
	field_id = e.content("id")
	if not class_id or not field_id:
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
	rows_val = e.content("rows")
	if name != None:
		mochi.db.execute("update fields set name=? where project=? and class=? and id=?", name, project_id, class_id, field_id)
	if required != None:
		mochi.db.execute("update fields set required=? where project=? and class=? and id=?", required, project_id, class_id, field_id)
	if multi != None:
		mochi.db.execute("update fields set multi=? where project=? and class=? and id=?", multi, project_id, class_id, field_id)
	if card != None:
		mochi.db.execute("update fields set card=? where project=? and class=? and id=?", card, project_id, class_id, field_id)
	if min_val != None:
		mochi.db.execute("update fields set min=? where project=? and class=? and id=?", min_val, project_id, class_id, field_id)
	if max_val != None:
		mochi.db.execute("update fields set max=? where project=? and class=? and id=?", max_val, project_id, class_id, field_id)
	if pattern != None:
		mochi.db.execute("update fields set pattern=? where project=? and class=? and id=?", pattern, project_id, class_id, field_id)
	if minlength != None:
		mochi.db.execute("update fields set minlength=? where project=? and class=? and id=?", minlength, project_id, class_id, field_id)
	if maxlength != None:
		mochi.db.execute("update fields set maxlength=? where project=? and class=? and id=?", maxlength, project_id, class_id, field_id)
	if prefix != None:
		mochi.db.execute("update fields set prefix=? where project=? and class=? and id=?", prefix, project_id, class_id, field_id)
	if suffix != None:
		mochi.db.execute("update fields set suffix=? where project=? and class=? and id=?", suffix, project_id, class_id, field_id)
	if format_str != None:
		mochi.db.execute("update fields set format=? where project=? and class=? and id=?", format_str, project_id, class_id, field_id)
	if position != None:
		mochi.db.execute("update fields set position=? where project=? and class=? and id=?", position, project_id, class_id, field_id)
	if rows_val != None:
		mochi.db.execute("update fields set rows=? where project=? and class=? and id=?", rows_val, project_id, class_id, field_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "field/update", "project": project_id, "class_id": class_id, "id": field_id})

# Field deleted
def event_field_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("class")
	field_id = e.content("id")
	if not class_id or not field_id:
		return
	mochi.db.execute("delete from options where project=? and class=? and field=?", project_id, class_id, field_id)
	mochi.db.execute("delete from fields where project=? and class=? and id=?", project_id, class_id, field_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "field/delete", "project": project_id, "class_id": class_id, "id": field_id})

# Field reorder
def event_field_reorder(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("class")
	order = e.content("order")
	if not class_id or not order:
		return
	for i, field_id in enumerate(order):
		mochi.db.execute("update fields set rank=? where project=? and class=? and id=?", i, project_id, class_id, field_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "field/reorder", "project": project_id, "class_id": class_id})

# Option created
def event_option_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	mochi.db.execute(
		"insert or ignore into options (project, class, field, id, name, colour, icon, rank) values (?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, e.content("class") or "", e.content("field") or "", e.content("id") or "",
		e.content("name") or "", e.content("colour") or "#94a3b8", e.content("icon") or "",
		e.content("rank") or 0
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "option/create", "project": project_id})

# Option updated
def event_option_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("class")
	field_id = e.content("field")
	option_id = e.content("id")
	if not class_id or not field_id or not option_id:
		return
	name = e.content("name")
	colour = e.content("colour")
	icon = e.content("icon")
	if name != None:
		mochi.db.execute("update options set name=? where project=? and class=? and field=? and id=?", name, project_id, class_id, field_id, option_id)
	if colour != None:
		mochi.db.execute("update options set colour=? where project=? and class=? and field=? and id=?", colour, project_id, class_id, field_id, option_id)
	if icon != None:
		mochi.db.execute("update options set icon=? where project=? and class=? and field=? and id=?", icon, project_id, class_id, field_id, option_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "option/update", "project": project_id})

# Option deleted
def event_option_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("class")
	field_id = e.content("field")
	option_id = e.content("id")
	if not class_id or not field_id or not option_id:
		return
	mochi.db.execute("delete from options where project=? and class=? and field=? and id=?", project_id, class_id, field_id, option_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "option/delete", "project": project_id})

# Option reorder
def event_option_reorder(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	class_id = e.content("class")
	field_id = e.content("field")
	order = e.content("order")
	if not class_id or not field_id or not order:
		return
	for i, option_id in enumerate(order):
		mochi.db.execute("update options set rank=? where project=? and class=? and field=? and id=?", i, project_id, class_id, field_id, option_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "option/reorder", "project": project_id})

# Handle merge request from subscriber (P2P request-response)
def event_merge_request(e):
	requester = e.header("from")
	project_id = e.content("project")

	project = mochi.db.row("select * from projects where id=? and owner=1", project_id)
	if not project:
		e.stream.write({"error": "Project not found", "code": 404})
		return

	# Check the requester has write access
	if not mochi.access.check(requester, "project/" + project_id, "write"):
		e.stream.write({"error": "Write access required", "code": 403})
		return

	repo_id = e.content("repo")
	source = e.content("source")
	target = e.content("target")
	message = e.content("message") or "Merge branch"
	method = e.content("method") or "merge"
	author_name = e.content("author_name") or "Mochi"
	author_email = e.content("author_email") or ""

	result = mochi.service.call("repositories", "merge", {
		"repo": repo_id,
		"source": source,
		"target": target,
		"message": message,
		"method": method,
		"author_name": author_name,
		"author_email": author_email,
	})

	if result == None:
		e.stream.write({"error": "Repositories service unavailable", "code": 500})
		return

	e.stream.write(result)


# ============================================================================
# Pull Request Actions
# ============================================================================

# List pull requests for an object
def action_pr_list(a):
	if not a.user:
		a.error(401, "Not logged in")
		return

	project_id = resolve_project(a)
	if not project_id:
		a.error(400, "Project ID required")
		return

	project = get_project(project_id)
	if project and project["owner"] == 1 and not check_project_access(a.user.identity.id, project_id, "view"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	prs = mochi.db.rows("select id, object, repository, source, target, status, title, description, draft, created, updated from pull_requests where object=?", object_id) or []
	return {"data": {"prs": prs}}

# Create a pull request on an object
def action_pr_create(a):
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
		return forward_to_owner(a, project_id, "pr/create", {
			"project": project_id, "object": a.input("object"),
			"repository": a.input("repository") or "",
			"source": a.input("source") or "",
			"target": a.input("target") or "",
			"title": a.input("title") or "",
			"description": a.input("description") or "",
			"draft": a.input("draft") or "0",
		})

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	object_id = a.input("object")
	if not object_id:
		a.error(400, "Object ID required")
		return

	obj = mochi.db.row("select * from objects where id=? and project=?", object_id, project_id)
	if not obj:
		a.error(404, "Object not found")
		return

	# Verify class allows pull requests
	cls = mochi.db.row("select pull_requests from classes where project=? and id=?", project_id, obj["class"])
	if not cls or cls["pull_requests"] != 1:
		a.error(400, "Pull requests not enabled for this class")
		return

	repository = a.input("repository")
	source = a.input("source")
	target = a.input("target")
	title = a.input("title")
	description = a.input("description")
	draft = 1 if a.input("draft") == "1" else 0

	now = mochi.time.now()
	pr_id = mochi.uid()

	mochi.db.execute(
		"insert into pull_requests (id, object, repository, source, target, status, title, description, draft, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		pr_id, object_id, repository or "", source or "", target or "", "open", title or "", description or "", draft, now, now
	)

	pr_data = {
		"id": pr_id, "object": object_id, "repository": repository or "",
		"source": source or "", "target": target or "", "status": "open",
		"title": title or "", "description": description or "", "draft": draft,
		"created": now, "updated": now,
	}

	broadcast_event(project_id, "pull_request/create", {
		"project": project_id, "pr": pr_data
	})

	return {"data": pr_data}

# Update a pull request
def action_pr_update(a):
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
		params = {"project": project_id, "object": a.input("object"), "pr": a.input("pr")}
		for k in ["repository", "source", "target", "status", "title", "description", "draft"]:
			v = a.input(k)
			if v != None:
				params[k] = v
		return forward_to_owner(a, project_id, "pr/update", params)

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	pr_id = a.input("pr")
	if not pr_id:
		a.error(400, "PR ID required")
		return

	pr = mochi.db.row("select * from pull_requests where id=?", pr_id)
	if not pr:
		a.error(404, "Pull request not found")
		return

	now = mochi.time.now()
	repository = a.input("repository")
	source = a.input("source")
	target = a.input("target")
	status = a.input("status")
	title = a.input("title")
	description = a.input("description")
	draft_input = a.input("draft")

	if repository:
		mochi.db.execute("update pull_requests set repository=?, updated=? where id=?", repository, now, pr_id)
	if source:
		mochi.db.execute("update pull_requests set source=?, updated=? where id=?", source, now, pr_id)
	if target:
		mochi.db.execute("update pull_requests set target=?, updated=? where id=?", target, now, pr_id)
	if status:
		mochi.db.execute("update pull_requests set status=?, updated=? where id=?", status, now, pr_id)
	if a.input.exists("title") and title:
		mochi.db.execute("update pull_requests set title=?, updated=? where id=?", title, now, pr_id)
	if a.input.exists("description"):
		mochi.db.execute("update pull_requests set description=?, updated=? where id=?", description, now, pr_id)
	if draft_input:
		draft = 1 if draft_input == "1" else 0
		mochi.db.execute("update pull_requests set draft=?, updated=? where id=?", draft, now, pr_id)

	# Re-read the updated row
	pr = mochi.db.row("select id, object, repository, source, target, status, title, description, draft, created, updated from pull_requests where id=?", pr_id)

	broadcast_event(project_id, "pull_request/update", {
		"project": project_id, "pr": pr
	})

	return {"data": pr}

# Delete a pull request
def action_pr_delete(a):
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
		return forward_to_owner(a, project_id, "pr/delete", {
			"project": project_id, "object": a.input("object"),
			"pr": a.input("pr"),
		})

	if not check_project_access(a.user.identity.id, project_id, "write"):
		a.error(403, "Access denied")
		return

	pr_id = a.input("pr")
	if not pr_id:
		a.error(400, "PR ID required")
		return

	pr = mochi.db.row("select * from pull_requests where id=?", pr_id)
	if not pr:
		a.error(404, "Pull request not found")
		return

	mochi.db.execute("delete from pull_requests where id=?", pr_id)

	broadcast_event(project_id, "pull_request/delete", {
		"project": project_id, "id": pr_id, "object": pr["object"]
	})

	return {"data": {"success": True}}


# ============================================================================
# Diff View Preference
# ============================================================================

# Get diff view preference (unified or split)
def action_diff_preference_get(a):
	if not a.user:
		a.error(401, "Not logged in")
		return
	value = a.user.preference.get("diff_view")
	style = value if value else "unified"
	return {"data": {"style": style}}

# Set diff view preference
def action_diff_preference_set(a):
	if not a.user:
		a.error(401, "Not logged in")
		return
	style = a.input("style")
	if style not in ("unified", "split"):
		a.error(400, "Style must be 'unified' or 'split'")
		return
	a.user.preference.set("diff_view", style)
	return {"data": {"style": style}}


# ============================================================================
# Pull Request P2P Events
# ============================================================================

# Pull request created remotely
def event_pull_request_create(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	pr = e.content("pr")
	if not pr:
		return
	mochi.db.execute(
		"insert or ignore into pull_requests (id, object, repository, source, target, status, title, description, draft, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		pr.get("id", ""), pr.get("object", ""), pr.get("repository", ""),
		pr.get("source", ""), pr.get("target", ""), pr.get("status", "open"),
		pr.get("title", ""), pr.get("description", ""), pr.get("draft", 0),
		pr.get("created", mochi.time.now()), pr.get("updated", mochi.time.now())
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "pull_request/create", "project": project_id, "pr": pr})

# Pull request updated remotely
def event_pull_request_update(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	pr = e.content("pr")
	if not pr:
		return
	pr_id = pr.get("id", "")
	if not pr_id:
		return
	mochi.db.execute(
		"update pull_requests set repository=?, source=?, target=?, status=?, title=?, description=?, draft=?, updated=? where id=?",
		pr.get("repository", ""), pr.get("source", ""), pr.get("target", ""),
		pr.get("status", ""), pr.get("title", ""), pr.get("description", ""),
		pr.get("draft", 0), pr.get("updated", mochi.time.now()), pr_id
	)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "pull_request/update", "project": project_id, "pr": pr})

# Pull request deleted remotely
def event_pull_request_delete(e):
	project_id = verify_subscription(e)
	if not project_id:
		return
	pr_id = e.content("id")
	if not pr_id:
		return
	mochi.db.execute("delete from pull_requests where id=?", pr_id)
	fp = mochi.entity.fingerprint(project_id)
	if fp:
		mochi.websocket.write(fp, {"type": "pull_request/delete", "project": project_id, "id": pr_id, "object": e.content("object")})


# ============================================================================
# Remote Request Handling (P2P request-response for subscriber actions)
# ============================================================================

# Required access level for each forwarded action
REQUEST_LEVELS = {
	"comment/create": "comment", "comment/update": "comment", "comment/delete": "comment",
	"watcher/add": "view", "watcher/remove": "view",
	"object/create": "write", "object/update": "write", "object/delete": "write",
	"object/move": "write", "values/set": "write", "value/set": "write",
	"link/create": "write", "link/delete": "write",
	"attachment/delete": "write",
	"pr/create": "write", "pr/update": "write", "pr/delete": "write",
	"class/create": "design", "class/update": "design", "class/delete": "design",
	"field/create": "design", "field/update": "design", "field/delete": "design",
	"field/reorder": "design",
	"option/create": "design", "option/update": "design", "option/delete": "design",
	"option/reorder": "design",
	"hierarchy/set": "design",
	"view/create": "design", "view/update": "design", "view/delete": "design",
	"view/reorder": "design",
}

# Handle incoming request from a subscriber
def event_request(e):
	requester = e.header("from")
	action = e.content("action")
	params = e.content("params") or {}
	user_id = params.get("_user", requester)
	user_name = params.get("_name", "")

	project_id = params.get("project")
	if not project_id:
		e.stream.write({"error": "Project required", "code": 400})
		return

	project = mochi.db.row("select * from projects where id=? and owner=1", project_id)
	if not project:
		e.stream.write({"error": "Project not found", "code": 404})
		return

	level = REQUEST_LEVELS.get(action)
	if not level:
		e.stream.write({"error": "Unknown action", "code": 400})
		return

	if not check_project_access(requester, project_id, level):
		e.stream.write({"error": "Access denied", "code": 403})
		return

	# Dispatch to handler
	if action == "comment/create":
		result = do_comment_create(project_id, project, params, user_id, user_name)
	elif action == "comment/update":
		result = do_comment_update(project_id, project, params, user_id)
	elif action == "comment/delete":
		result = do_comment_delete(project_id, project, params, user_id)
	elif action == "watcher/add":
		result = do_watcher_add(project_id, params, user_id)
	elif action == "watcher/remove":
		result = do_watcher_remove(project_id, params, user_id)
	elif action == "object/create":
		result = do_object_create(project_id, project, params, user_id)
	elif action == "object/update":
		result = do_object_update(project_id, project, params, user_id)
	elif action == "object/delete":
		result = do_object_delete(project_id, project, params, user_id)
	elif action == "object/move":
		result = do_object_move(project_id, project, params, user_id)
	elif action == "values/set":
		result = do_values_set(project_id, project, params, user_id)
	elif action == "value/set":
		result = do_value_set(project_id, project, params, user_id)
	elif action == "link/create":
		result = do_link_create(project_id, project, params, user_id)
	elif action == "link/delete":
		result = do_link_delete(project_id, project, params, user_id)
	elif action == "attachment/delete":
		result = do_attachment_delete(project_id, project, params, user_id)
	elif action == "pr/create":
		result = do_pr_create(project_id, project, params, user_id)
	elif action == "pr/update":
		result = do_pr_update(project_id, project, params, user_id)
	elif action == "pr/delete":
		result = do_pr_delete(project_id, project, params, user_id)
	elif action == "class/create":
		result = do_class_create(project_id, project, params)
	elif action == "class/update":
		result = do_class_update(project_id, project, params)
	elif action == "class/delete":
		result = do_class_delete(project_id, project, params)
	elif action == "field/create":
		result = do_field_create(project_id, project, params)
	elif action == "field/update":
		result = do_field_update(project_id, project, params)
	elif action == "field/delete":
		result = do_field_delete(project_id, project, params)
	elif action == "field/reorder":
		result = do_field_reorder(project_id, project, params)
	elif action == "option/create":
		result = do_option_create(project_id, project, params)
	elif action == "option/update":
		result = do_option_update(project_id, project, params)
	elif action == "option/delete":
		result = do_option_delete(project_id, project, params)
	elif action == "option/reorder":
		result = do_option_reorder(project_id, project, params)
	elif action == "hierarchy/set":
		result = do_hierarchy_set(project_id, project, params)
	elif action == "view/create":
		result = do_view_create(project_id, project, params)
	elif action == "view/update":
		result = do_view_update(project_id, project, params)
	elif action == "view/delete":
		result = do_view_delete(project_id, project, params)
	elif action == "view/reorder":
		result = do_view_reorder(project_id, project, params)
	else:
		result = {"error": "Not implemented", "code": 501}

	e.stream.write(result)

# Check a user's access level for a project
def event_access_check(e):
	project_id = e.header("to")
	user_id = e.content("user") or e.header("from")
	result = {}
	for op in ["design", "write", "comment", "view"]:
		result[op] = check_project_access(user_id, project_id, op)
	e.stream.write(result)


# ============================================================================
# Remote Request Do Helpers (shared by action handlers and event_request)
# ============================================================================

# Comment helpers
def do_comment_create(project_id, project, params, user_id, user_name):
	object_id = params.get("object")
	content = params.get("content")
	parent = params.get("parent", "")
	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		return {"error": "Object not found", "code": 404}
	if not content or not content.strip():
		return {"error": "Content is required", "code": 400}
	comment_id = mochi.uid()
	now = mochi.time.now()
	mochi.db.execute(
		"insert into comments (id, object, parent, author, name, content, created, edited) values (?, ?, ?, ?, ?, ?, ?, ?)",
		comment_id, object_id, parent, user_id, user_name, content.strip(), now, 0
	)
	mochi.db.execute("update objects set updated=? where id=?", now, object_id)
	log_activity(object_id, user_id, "commented")
	# Auto-watch commenter on owner's server
	mochi.db.execute(
		"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
		object_id, user_id, now)
	broadcast_event(project_id, "comment/create", {
		"project": project_id, "object": object_id, "id": comment_id,
		"parent": parent, "author": user_id, "name": user_name,
		"content": content.strip(), "created": now, "actor": user_id
	})
	# Notify owner if watching
	owner_id = get_owner_identity(project_id)
	excerpt = (content.strip())[:80]
	notify_watchers(object_id, project_id, owner_id, user_id, user_name + ": " + excerpt, user_name + ": " + excerpt)
	return {"id": comment_id, "author": user_id, "name": user_name,
			"content": content.strip(), "created": now}

def do_comment_update(project_id, project, params, user_id):
	object_id = params.get("object")
	comment_id = params.get("comment")
	content = params.get("content")
	if not object_id or not comment_id:
		return {"error": "Object and comment ID required", "code": 400}
	comment = mochi.db.row("select * from comments where id=? and object=?", comment_id, object_id)
	if not comment:
		return {"error": "Comment not found", "code": 404}
	if comment["author"] != user_id:
		return {"error": "Cannot edit another user's comment", "code": 403}
	if not content or not content.strip():
		return {"error": "Content is required", "code": 400}
	now = mochi.time.now()
	mochi.db.execute("update comments set content=?, edited=? where id=?", content.strip(), now, comment_id)
	broadcast_event(project_id, "comment/update", {
		"project": project_id, "object": object_id,
		"id": comment_id, "content": content.strip(), "edited": now, "actor": user_id
	})
	return {"success": True}

def do_comment_delete(project_id, project, params, user_id):
	object_id = params.get("object")
	comment_id = params.get("comment")
	if not object_id or not comment_id:
		return {"error": "Object and comment ID required", "code": 400}
	comment = mochi.db.row("select * from comments where id=? and object=?", comment_id, object_id)
	if not comment:
		return {"error": "Comment not found", "code": 404}
	if comment["author"] != user_id:
		return {"error": "Cannot delete another user's comment", "code": 403}
	mochi.db.execute("delete from comments where id=?", comment_id)
	broadcast_event(project_id, "comment/delete", {
		"project": project_id, "object": object_id, "id": comment_id, "actor": user_id
	})
	return {"success": True}

# Watcher helpers
def do_watcher_add(project_id, params, user_id):
	object_id = params.get("object")
	if not object_id:
		return {"error": "Object ID required", "code": 400}
	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		return {"error": "Object not found", "code": 404}
	now = mochi.time.now()
	mochi.db.execute(
		"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
		object_id, user_id, now
	)
	return {"success": True, "watching": True}

def do_watcher_remove(project_id, params, user_id):
	object_id = params.get("object")
	if not object_id:
		return {"error": "Object ID required", "code": 400}
	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		return {"error": "Object not found", "code": 404}
	mochi.db.execute("delete from watchers where object=? and user=?", object_id, user_id)
	return {"success": True, "watching": False}

# Object helpers
def do_object_create(project_id, project, params, user_id):
	obj_class = params.get("class")
	if not obj_class:
		return {"error": "Class is required", "code": 400}
	class_row = mochi.db.row("select id from classes where project=? and id=?", project_id, obj_class)
	if not class_row:
		return {"error": "Invalid class", "code": 400}
	parent = params.get("parent", "")
	title = params.get("title", "")
	new_counter = project["counter"] + 1
	mochi.db.execute("update projects set counter=?, updated=? where id=?", new_counter, mochi.time.now(), project_id)
	max_rank_row = mochi.db.row("select coalesce(max(rank), 0) as max_rank from objects where project=?", project_id)
	initial_rank = (max_rank_row["max_rank"] if max_rank_row else 0) + 1
	object_id = mochi.uid()
	now = mochi.time.now()
	mochi.db.execute(
		"insert into objects (id, project, class, number, parent, rank, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?)",
		object_id, project_id, obj_class, new_counter, parent, initial_rank, now, now
	)
	values = {}
	if title:
		mochi.db.execute("insert into \"values\" (object, field, value) values (?, ?, ?)", object_id, "title", title)
		values["title"] = title
	log_activity(object_id, user_id, "created")
	mochi.db.execute("insert into watchers (object, user, created) values (?, ?, ?)", object_id, user_id, now)
	broadcast_event(project_id, "object/create", {
		"project": project_id, "id": object_id, "class": obj_class,
		"number": new_counter, "parent": parent, "values": values,
		"created": now, "actor": user_id
	})
	# Notify owner when subscriber creates an object
	owner_id = get_owner_identity(project_id)
	if owner_id and owner_id != user_id:
		readable = project["prefix"] + "-" + str(new_counter)
		first_field_row = mochi.db.row("select id from fields where class=? order by rank limit 1", params.get("class", ""))
		first_field = first_field_row["id"] if first_field_row else ""
		title_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, first_field) if first_field else None
		obj_title = title_row["value"] if title_row else ""
		fp = mochi.entity.fingerprint(project_id)
		url = "/projects/" + fp if fp else "/projects"
		display = readable + " " + obj_title + " — created" if obj_title else readable + " created"
		mochi.service.call("notifications", "send", "update",
			display, "New object created", object_id, url)
	return {"id": object_id, "number": new_counter,
			"readable": project["prefix"] + "-" + str(new_counter)}

def do_object_update(project_id, project, params, user_id):
	object_id = params.get("object")
	if not object_id:
		return {"error": "Object ID required", "code": 400}
	row = mochi.db.row("select * from objects where id=? and project=?", object_id, project_id)
	if not row:
		return {"error": "Object not found", "code": 404}
	now = mochi.time.now()
	parent = params.get("parent")
	if parent != None:
		old_parent = row["parent"]
		if parent != old_parent:
			if parent and would_create_cycle(object_id, parent):
				return {"error": "Cannot set parent: would create a cycle", "code": 400}
			if parent:
				parent_row = mochi.db.row("select class from objects where id=? and project=?", parent, project_id)
				if not parent_row:
					return {"error": "Parent object not found", "code": 404}
				parent_class = parent_row["class"]
			else:
				parent_class = ""
			allowed = mochi.db.exists("select 1 from hierarchy where project=? and class=? and parent=?", project_id, row["class"], parent_class)
			if not allowed:
				return {"error": "Cannot set parent: hierarchy rules do not allow this relationship", "code": 400}
			mochi.db.execute("update objects set parent=?, updated=? where id=?", parent, now, object_id)
			log_activity(object_id, user_id, "moved", "parent", old_parent, parent)
	new_class = params.get("class")
	if new_class and new_class != row["class"]:
		class_row = mochi.db.row("select id from classes where project=? and id=?", project_id, new_class)
		if class_row:
			mochi.db.execute("update objects set class=?, updated=? where id=?", new_class, now, object_id)
			log_activity(object_id, user_id, "updated", "class", row["class"], new_class)
	mochi.db.execute("update objects set updated=? where id=?", now, object_id)
	broadcast_event(project_id, "object/update", {
		"project": project_id, "id": object_id,
		"parent": parent if parent != None else row["parent"],
		"class": new_class if new_class and new_class != row["class"] else row["class"],
		"actor": user_id
	})
	# Notify owner if watching
	owner_id = get_owner_identity(project_id)
	notify_watchers(object_id, project_id, owner_id, user_id, "updated", "Object modified")
	return {"success": True}

def do_object_delete(project_id, project, params, user_id):
	object_id = params.get("object")
	if not object_id:
		return {"error": "Object ID required", "code": 400}
	row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	if not row:
		return {"error": "Object not found", "code": 404}
	# Notify owner before cascade (watchers get deleted in cascade)
	owner_id = get_owner_identity(project_id)
	notify_watchers(object_id, project_id, owner_id, user_id, "deleted", "Object deleted")
	delete_object_cascade(project_id, object_id, user_id)
	return {"success": True}

def do_object_move(project_id, project, params, user_id):
	object_id = params.get("object")
	if not object_id:
		return {"error": "Object ID required", "code": 400}
	row = mochi.db.row("select id, rank from objects where id=? and project=?", object_id, project_id)
	if not row:
		return {"error": "Object not found", "code": 404}
	old_rank = row["rank"]
	field = params.get("field", "")
	value = params.get("value")
	new_rank = params.get("rank")
	old_value_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, field)
	old_value = old_value_row["value"] if old_value_row else ""
	target_value = value if value else old_value
	value_changed = old_value != target_value
	if value_changed:
		mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field, target_value)
		log_activity(object_id, user_id, "updated", field, old_value, target_value)
	if new_rank != None:
		new_rank = int(new_rank)
		if value_changed or new_rank != old_rank:
			objects_in_column = mochi.db.rows("""
				select o.id, o.rank from objects o
				left join "values" v on v.object = o.id and v.field=?
				where o.project=? and coalesce(v.value, '')=? and o.id!=?
				order by o.rank asc
			""", field, project_id, target_value, object_id) or []
			rank = 1
			for obj in objects_in_column:
				if rank == new_rank:
					rank += 1
				mochi.db.execute("update objects set rank=? where id=?", rank, obj["id"])
				rank += 1
			mochi.db.execute("update objects set rank=? where id=?", new_rank, object_id)
	elif value_changed:
		max_rank_row = mochi.db.row("""
			select coalesce(max(o.rank), 0) as max_rank from objects o
			left join "values" v on v.object = o.id and v.field=?
			where o.project=? and coalesce(v.value, '')=? and o.id!=?
		""", field, project_id, target_value, object_id)
		new_rank = (max_rank_row["max_rank"] if max_rank_row else 0) + 1
		mochi.db.execute("update objects set rank=? where id=?", new_rank, object_id)
	row_field = params.get("row_field")
	row_value = params.get("row_value")
	row_changed = False
	if row_field:
		old_row_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, row_field)
		old_row_value = old_row_row["value"] if old_row_row else ""
		if old_row_value != row_value:
			mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, row_field, row_value)
			log_activity(object_id, user_id, "updated", row_field, old_row_value, row_value)
			row_changed = True
	mochi.db.execute("update objects set updated=? where id=?", mochi.time.now(), object_id)
	updated_values = {}
	if value_changed:
		updated_values[field] = target_value
	if row_changed:
		updated_values[row_field] = row_value
	if updated_values:
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id,
			"values": updated_values, "actor": user_id
		})
		# Notify owner if watching
		owner_id = get_owner_identity(project_id)
		notify_watchers(object_id, project_id, owner_id, user_id, "updated", "Fields changed")
	return {"success": True}

# Value helpers
def do_values_set(project_id, project, params, user_id):
	object_id = params.get("object")
	if not object_id:
		return {"error": "Object ID required", "code": 400}
	row = mochi.db.row("select id, class from objects where id=? and project=?", object_id, project_id)
	if not row:
		return {"error": "Object not found", "code": 404}
	valid_fields = {}
	field_types = {}
	field_rows = mochi.db.rows("select id, name, fieldtype from fields where project=? and class=?", project_id, row["class"]) or []
	for f in field_rows:
		valid_fields[f["id"]] = f["name"]
		field_types[f["id"]] = f["fieldtype"]
	now = mochi.time.now()
	changes = []
	values = params.get("values", {})
	for field_id in values:
		if field_id not in valid_fields:
			continue
		new_value = values[field_id]
		old_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, field_id)
		old_value = old_row["value"] if old_row else ""
		if str(new_value) != old_value:
			mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field_id, str(new_value))
			log_activity(object_id, user_id, "updated", field_id, old_value, str(new_value))
			changes.append(field_id)
	if changes:
		mochi.db.execute("update objects set updated=? where id=?", now, object_id)
		changed_values = {}
		for fid in changes:
			val = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, fid)
			if val:
				changed_values[fid] = val["value"]
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id, "values": changed_values, "actor": user_id
		})
		# Notify owner if watching
		owner_id = get_owner_identity(project_id)
		notify_watchers(object_id, project_id, owner_id, user_id, "updated", "Fields changed")
		# Auto-watch assigned users
		for fid in changes:
			if field_types.get(fid) == "user":
				assigned = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, fid)
				if assigned and assigned["value"]:
					mochi.db.execute(
						"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
						object_id, assigned["value"], now)
	return {"success": True, "changed": changes}

def do_value_set(project_id, project, params, user_id):
	object_id = params.get("object")
	field_id = params.get("field")
	if not object_id:
		return {"error": "Object ID required", "code": 400}
	if not field_id:
		return {"error": "Field ID required", "code": 400}
	row = mochi.db.row("select id, class from objects where id=? and project=?", object_id, project_id)
	if not row:
		return {"error": "Object not found", "code": 404}
	field_row = mochi.db.row("select id, fieldtype from fields where project=? and class=? and id=?", project_id, row["class"], field_id)
	if not field_row:
		return {"error": "Invalid field for this class", "code": 400}
	new_value = params.get("value", "")
	old_row = mochi.db.row("select value from \"values\" where object=? and field=?", object_id, field_id)
	old_value = old_row["value"] if old_row else ""
	if str(new_value) != old_value:
		mochi.db.execute("replace into \"values\" (object, field, value) values (?, ?, ?)", object_id, field_id, str(new_value))
		now = mochi.time.now()
		mochi.db.execute("update objects set updated=? where id=?", now, object_id)
		log_activity(object_id, user_id, "updated", field_id, old_value, str(new_value))
		broadcast_event(project_id, "values/update", {
			"project": project_id, "id": object_id,
			"values": {field_id: str(new_value)}, "actor": user_id
		})
		# Notify owner if watching
		owner_id = get_owner_identity(project_id)
		notify_watchers(object_id, project_id, owner_id, user_id, "updated", "Fields changed")
		# Auto-watch assigned user
		if field_row["fieldtype"] == "user" and str(new_value):
			mochi.db.execute(
				"insert or ignore into watchers (object, user, created) values (?, ?, ?)",
				object_id, str(new_value), now)
	return {"success": True}

# Link helpers
def do_link_create(project_id, project, params, user_id):
	object_id = params.get("object")
	target_id = params.get("target")
	linktype = params.get("linktype")
	if not object_id or not target_id or not linktype:
		return {"error": "Object, target, and linktype are required", "code": 400}
	if linktype not in ["blocks", "blocked_by", "relates", "duplicates"]:
		return {"error": "Invalid link type", "code": 400}
	source_row = mochi.db.row("select id from objects where id=? and project=?", object_id, project_id)
	target_row = mochi.db.row("select id from objects where id=? and project=?", target_id, project_id)
	if not source_row or not target_row:
		return {"error": "Object not found", "code": 404}
	if object_id == target_id:
		return {"error": "Cannot link object to itself", "code": 400}
	existing = mochi.db.exists("select 1 from links where source=? and target=? and linktype=?", object_id, target_id, linktype)
	if existing:
		return {"error": "Link already exists", "code": 400}
	now = mochi.time.now()
	mochi.db.execute(
		"insert into links (project, source, target, linktype, created) values (?, ?, ?, ?, ?)",
		project_id, object_id, target_id, linktype, now
	)
	log_activity(object_id, user_id, "linked", linktype, "", target_id)
	broadcast_event(project_id, "link/create", {
		"project": project_id, "source": object_id,
		"target": target_id, "linktype": linktype, "created": now, "actor": user_id
	})
	# Notify owner if watching
	owner_id = get_owner_identity(project_id)
	notify_watchers(object_id, project_id, owner_id, user_id, "linked", "Link added")
	return {"success": True}

def do_link_delete(project_id, project, params, user_id):
	object_id = params.get("object")
	target_id = params.get("target")
	linktype = params.get("linktype")
	if not object_id or not target_id or not linktype:
		return {"error": "Object, target, and linktype are required", "code": 400}
	mochi.db.execute("delete from links where source=? and target=? and linktype=?", object_id, target_id, linktype)
	broadcast_event(project_id, "link/delete", {
		"project": project_id, "source": object_id,
		"target": target_id, "linktype": linktype, "actor": user_id
	})
	# Notify owner if watching
	owner_id = get_owner_identity(project_id)
	notify_watchers(object_id, project_id, owner_id, user_id, "linked", "Link removed")
	return {"success": True}

# Attachment helper
def do_attachment_delete(project_id, project, params, user_id):
	object_id = params.get("object")
	attachment_id = params.get("attachment")
	if not object_id or not attachment_id:
		return {"error": "Object and attachment ID required", "code": 400}
	attachment = mochi.db.row("select * from attachments where id=? and object=?", attachment_id, object_id)
	if not attachment:
		return {"error": "Attachment not found", "code": 404}
	mochi.attachment.delete(object_id, attachment_id)
	mochi.db.execute("delete from attachments where id=?", attachment_id)
	return {"success": True}

# PR helpers
def do_pr_create(project_id, project, params, user_id):
	object_id = params.get("object")
	if not object_id:
		return {"error": "Object ID required", "code": 400}
	obj = mochi.db.row("select * from objects where id=? and project=?", object_id, project_id)
	if not obj:
		return {"error": "Object not found", "code": 404}
	cls = mochi.db.row("select pull_requests from classes where project=? and id=?", project_id, obj["class"])
	if not cls or cls["pull_requests"] != 1:
		return {"error": "Pull requests not enabled for this class", "code": 400}
	repository = params.get("repository", "")
	source = params.get("source", "")
	target = params.get("target", "")
	title = params.get("title", "")
	description = params.get("description", "")
	draft = 1 if params.get("draft") == "1" else 0
	now = mochi.time.now()
	pr_id = mochi.uid()
	mochi.db.execute(
		"insert into pull_requests (id, object, repository, source, target, status, title, description, draft, created, updated) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		pr_id, object_id, repository, source, target, "open", title, description, draft, now, now
	)
	pr_data = {
		"id": pr_id, "object": object_id, "repository": repository,
		"source": source, "target": target, "status": "open",
		"title": title, "description": description, "draft": draft,
		"created": now, "updated": now,
	}
	broadcast_event(project_id, "pull_request/create", {"project": project_id, "pr": pr_data})
	return pr_data

def do_pr_update(project_id, project, params, user_id):
	pr_id = params.get("pr")
	if not pr_id:
		return {"error": "PR ID required", "code": 400}
	pr = mochi.db.row("select * from pull_requests where id=?", pr_id)
	if not pr:
		return {"error": "Pull request not found", "code": 404}
	now = mochi.time.now()
	repository = params.get("repository")
	source = params.get("source")
	target = params.get("target")
	status = params.get("status")
	title = params.get("title")
	description = params.get("description")
	draft_input = params.get("draft")
	if repository:
		mochi.db.execute("update pull_requests set repository=?, updated=? where id=?", repository, now, pr_id)
	if source:
		mochi.db.execute("update pull_requests set source=?, updated=? where id=?", source, now, pr_id)
	if target:
		mochi.db.execute("update pull_requests set target=?, updated=? where id=?", target, now, pr_id)
	if status:
		mochi.db.execute("update pull_requests set status=?, updated=? where id=?", status, now, pr_id)
	if title:
		mochi.db.execute("update pull_requests set title=?, updated=? where id=?", title, now, pr_id)
	if description != None:
		mochi.db.execute("update pull_requests set description=?, updated=? where id=?", description, now, pr_id)
	if draft_input:
		draft = 1 if draft_input == "1" else 0
		mochi.db.execute("update pull_requests set draft=?, updated=? where id=?", draft, now, pr_id)
	pr = mochi.db.row("select id, object, repository, source, target, status, title, description, draft, created, updated from pull_requests where id=?", pr_id)
	broadcast_event(project_id, "pull_request/update", {"project": project_id, "pr": pr})
	return pr

def do_pr_delete(project_id, project, params, user_id):
	pr_id = params.get("pr")
	if not pr_id:
		return {"error": "PR ID required", "code": 400}
	pr = mochi.db.row("select * from pull_requests where id=?", pr_id)
	if not pr:
		return {"error": "Pull request not found", "code": 404}
	mochi.db.execute("delete from pull_requests where id=?", pr_id)
	broadcast_event(project_id, "pull_request/delete", {
		"project": project_id, "id": pr_id, "object": pr["object"]
	})
	return {"success": True}

# Class helpers
def do_class_create(project_id, project, params):
	name = params.get("name")
	if not name or not name.strip():
		return {"error": "Name is required", "code": 400}
	class_id = name.strip().lower().replace(" ", "_")
	existing = mochi.db.exists("select 1 from classes where project=? and id=?", project_id, class_id)
	if existing:
		return {"error": "A class with this name already exists", "code": 400}
	max_rank = mochi.db.row("select max(rank) as m from classes where project=?", project_id)
	rank = (max_rank["m"] or 0) + 1 if max_rank else 0
	pr_flag = 1 if params.get("pull_requests") == "1" else 0
	mochi.db.execute(
		"insert into classes (project, id, name, rank, pull_requests) values (?, ?, ?, ?, ?)",
		project_id, class_id, name.strip(), rank, pr_flag
	)
	mochi.db.execute(
		"insert into fields (project, class, id, name, fieldtype, required, rank) values (?, ?, ?, ?, ?, ?, ?)",
		project_id, class_id, "title", "Title", "text", 1, 0
	)
	mochi.db.execute(
		"insert into hierarchy (project, class, parent) values (?, ?, ?)",
		project_id, class_id, ""
	)
	broadcast_event(project_id, "class/create", {
		"project": project_id, "id": class_id, "name": name.strip(), "rank": rank, "pull_requests": pr_flag
	})
	return {"id": class_id, "name": name.strip(), "rank": rank}

def do_class_update(project_id, project, params):
	class_id = params.get("class")
	if not class_id:
		return {"error": "Type ID required", "code": 400}
	class_row = mochi.db.row("select * from classes where project=? and id=?", project_id, class_id)
	if not class_row:
		return {"error": "Class not found", "code": 404}
	name = params.get("name")
	if name:
		mochi.db.execute("update classes set name=? where project=? and id=?", name.strip(), project_id, class_id)
	pr_input = params.get("pull_requests")
	if pr_input:
		pr_flag = 1 if pr_input == "1" else 0
		mochi.db.execute("update classes set pull_requests=? where project=? and id=?", pr_flag, project_id, class_id)
	broadcast_event(project_id, "class/update", {
		"project": project_id, "id": class_id, "name": name or class_row["name"],
		"pull_requests": class_row["pull_requests"] if not pr_input else (1 if pr_input == "1" else 0)
	})
	return {"success": True}

def do_class_delete(project_id, project, params):
	class_id = params.get("class")
	if not class_id:
		return {"error": "Class ID required", "code": 400}
	has_objects = mochi.db.exists("select 1 from objects where project=? and class=?", project_id, class_id)
	if has_objects:
		return {"error": "Cannot delete class with existing objects", "code": 400}
	mochi.db.execute("delete from options where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from fields where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from hierarchy where project=? and class=?", project_id, class_id)
	mochi.db.execute("delete from classes where project=? and id=?", project_id, class_id)
	broadcast_event(project_id, "class/delete", {"project": project_id, "id": class_id})
	return {"success": True}

# Field helpers
def do_field_create(project_id, project, params):
	class_id = params.get("class")
	if not class_id:
		return {"error": "Type ID required", "code": 400}
	class_row = mochi.db.row("select id from classes where project=? and id=?", project_id, class_id)
	if not class_row:
		return {"error": "Type not found", "code": 404}
	name = params.get("name")
	if not name or not name.strip():
		return {"error": "Name is required", "code": 400}
	fieldtype = params.get("fieldtype", "text")
	if fieldtype not in ["text", "number", "date", "enumerated", "user", "object", "checkbox", "checklist"]:
		return {"error": "Invalid field type", "code": 400}
	field_id = name.strip().lower().replace(" ", "_")
	existing = mochi.db.exists("select 1 from fields where project=? and class=? and id=?", project_id, class_id, field_id)
	if existing:
		return {"error": "A field with this name already exists", "code": 400}
	max_rank = mochi.db.row("select max(rank) as m from fields where project=? and class=?", project_id, class_id)
	rank = (max_rank["m"] or 0) + 1 if max_rank else 0
	required = 1 if params.get("required") == "1" or params.get("required") == "true" else 0
	multi = 1 if params.get("multi") == "1" or params.get("multi") == "true" else 0
	card = 1 if params.get("card") != "0" and params.get("card") != "false" else 0
	rows = int(params.get("rows")) if params.get("rows") else 1
	mochi.db.execute(
		"insert into fields (project, class, id, name, fieldtype, required, multi, rank, card, rows) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, class_id, field_id, name.strip(), fieldtype, required, multi, rank, card, rows
	)
	broadcast_event(project_id, "field/create", {
		"project": project_id, "class": class_id, "id": field_id,
		"name": name.strip(), "fieldtype": fieldtype, "required": required,
		"multi": multi, "rank": rank, "card": card, "rows": rows
	})
	return {"id": field_id, "name": name.strip(), "fieldtype": fieldtype, "rank": rank}

def do_field_update(project_id, project, params):
	class_id = params.get("class")
	field_id = params.get("field")
	if not class_id or not field_id:
		return {"error": "Type and field ID required", "code": 400}
	field_row = mochi.db.row("select * from fields where project=? and class=? and id=?", project_id, class_id, field_id)
	if not field_row:
		return {"error": "Field not found", "code": 404}
	name = params.get("name")
	required = params.get("required")
	multi = params.get("multi")
	card = params.get("card")
	position = params.get("position")
	rows_val = params.get("rows")
	if name != None:
		mochi.db.execute("update fields set name=? where project=? and class=? and id=?", name.strip(), project_id, class_id, field_id)
	if required != None:
		req_val = 1 if required == "1" or required == "true" else 0
		mochi.db.execute("update fields set required=? where project=? and class=? and id=?", req_val, project_id, class_id, field_id)
	if multi != None:
		multi_val = 1 if multi == "1" or multi == "true" else 0
		mochi.db.execute("update fields set multi=? where project=? and class=? and id=?", multi_val, project_id, class_id, field_id)
	if card != None:
		card_val = 1 if card == "1" or card == "true" else 0
		mochi.db.execute("update fields set card=? where project=? and class=? and id=?", card_val, project_id, class_id, field_id)
	if position != None:
		mochi.db.execute("update fields set position=? where project=? and class=? and id=?", position, project_id, class_id, field_id)
	if rows_val != None:
		mochi.db.execute("update fields set rows=? where project=? and class=? and id=?", int(rows_val), project_id, class_id, field_id)
	update_data = {"project": project_id, "class": class_id, "id": field_id}
	if name != None:
		update_data["name"] = name.strip()
	if required != None:
		update_data["required"] = 1 if required == "1" or required == "true" else 0
	if multi != None:
		update_data["multi"] = 1 if multi == "1" or multi == "true" else 0
	if card != None:
		update_data["card"] = 1 if card == "1" or card == "true" else 0
	if position != None:
		update_data["position"] = position
	if rows_val != None:
		update_data["rows"] = int(rows_val)
	broadcast_event(project_id, "field/update", update_data)
	return {"success": True}

def do_field_delete(project_id, project, params):
	class_id = params.get("class")
	field_id = params.get("field")
	if not class_id or not field_id:
		return {"error": "Type and field ID required", "code": 400}
	mochi.db.execute("delete from options where project=? and class=? and field=?", project_id, class_id, field_id)
	mochi.db.execute("delete from fields where project=? and class=? and id=?", project_id, class_id, field_id)
	broadcast_event(project_id, "field/delete", {"project": project_id, "class": class_id, "id": field_id})
	return {"success": True}

def do_field_reorder(project_id, project, params):
	class_id = params.get("class")
	if not class_id:
		return {"error": "Type ID required", "code": 400}
	order_str = params.get("order", "")
	order = [f.strip() for f in order_str.split(",") if f.strip()]
	for i, field_id in enumerate(order):
		mochi.db.execute(
			"update fields set rank=? where project=? and class=? and id=?",
			i, project_id, class_id, field_id
		)
	broadcast_event(project_id, "field/reorder", {"project": project_id, "class": class_id, "order": order})
	return {"success": True}

# Option helpers
def do_option_create(project_id, project, params):
	class_id = params.get("class")
	field_id = params.get("field")
	if not class_id or not field_id:
		return {"error": "Type and field ID required", "code": 400}
	field_row = mochi.db.row("select fieldtype from fields where project=? and class=? and id=?", project_id, class_id, field_id)
	if not field_row:
		return {"error": "Field not found", "code": 404}
	if field_row["fieldtype"] != "enumerated":
		return {"error": "Options can only be added to enumerated fields", "code": 400}
	name = params.get("name")
	if not name or not name.strip():
		return {"error": "Name is required", "code": 400}
	option_id = name.strip().lower().replace(" ", "_")
	existing = mochi.db.exists("select 1 from options where project=? and class=? and field=? and id=?", project_id, class_id, field_id, option_id)
	if existing:
		return {"error": "An option with this name already exists", "code": 400}
	max_rank = mochi.db.row("select max(rank) as m from options where project=? and class=? and field=?", project_id, class_id, field_id)
	rank = (max_rank["m"] or 0) + 1 if max_rank else 0
	colour = params.get("colour", "#94a3b8")
	icon = params.get("icon", "")
	mochi.db.execute(
		"insert into options (project, class, field, id, name, colour, icon, rank) values (?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, class_id, field_id, option_id, name.strip(), colour, icon, rank
	)
	broadcast_event(project_id, "option/create", {
		"project": project_id, "class": class_id, "field": field_id,
		"id": option_id, "name": name.strip(), "colour": colour, "icon": icon, "rank": rank
	})
	return {"id": option_id, "name": name.strip(), "colour": colour, "rank": rank}

def do_option_update(project_id, project, params):
	class_id = params.get("class")
	field_id = params.get("field")
	option_id = params.get("option")
	if not class_id or not field_id or not option_id:
		return {"error": "Type, field, and option ID required", "code": 400}
	option_row = mochi.db.row("select * from options where project=? and class=? and field=? and id=?", project_id, class_id, field_id, option_id)
	if not option_row:
		return {"error": "Option not found", "code": 404}
	name = params.get("name")
	colour = params.get("colour")
	icon = params.get("icon")
	if name != None:
		mochi.db.execute("update options set name=? where project=? and class=? and field=? and id=?", name.strip(), project_id, class_id, field_id, option_id)
	if colour != None:
		mochi.db.execute("update options set colour=? where project=? and class=? and field=? and id=?", colour, project_id, class_id, field_id, option_id)
	if icon != None:
		mochi.db.execute("update options set icon=? where project=? and class=? and field=? and id=?", icon, project_id, class_id, field_id, option_id)
	update_data = {"project": project_id, "class": class_id, "field": field_id, "id": option_id}
	if name != None:
		update_data["name"] = name.strip()
	if colour != None:
		update_data["colour"] = colour
	if icon != None:
		update_data["icon"] = icon
	broadcast_event(project_id, "option/update", update_data)
	return {"success": True}

def do_option_delete(project_id, project, params):
	class_id = params.get("class")
	field_id = params.get("field")
	option_id = params.get("option")
	if not class_id or not field_id or not option_id:
		return {"error": "Type, field, and option ID required", "code": 400}
	mochi.db.execute("delete from options where project=? and class=? and field=? and id=?", project_id, class_id, field_id, option_id)
	broadcast_event(project_id, "option/delete", {"project": project_id, "class": class_id, "field": field_id, "id": option_id})
	return {"success": True}

def do_option_reorder(project_id, project, params):
	class_id = params.get("class")
	field_id = params.get("field")
	if not class_id or not field_id:
		return {"error": "Type and field ID required", "code": 400}
	order_str = params.get("order", "")
	order = [o.strip() for o in order_str.split(",") if o.strip()]
	for i, option_id in enumerate(order):
		mochi.db.execute(
			"update options set rank=? where project=? and class=? and field=? and id=?",
			i, project_id, class_id, field_id, option_id
		)
	broadcast_event(project_id, "option/reorder", {"project": project_id, "class": class_id, "field": field_id, "order": order})
	return {"success": True}

# Hierarchy helper
def do_hierarchy_set(project_id, project, params):
	class_id = params.get("class")
	if not class_id:
		return {"error": "Type ID required", "code": 400}
	class_row = mochi.db.row("select id from classes where project=? and id=?", project_id, class_id)
	if not class_row:
		return {"error": "Type not found", "code": 404}
	parents_str = params.get("parents")
	if parents_str == None or parents_str == "_none_":
		parents = []
	elif parents_str == "":
		parents = [""]
	else:
		parents = [p.strip() for p in parents_str.split(",")]
	mochi.db.execute("delete from hierarchy where project=? and class=?", project_id, class_id)
	for parent in parents:
		if parent and parent != "":
			parent_exists = mochi.db.exists("select 1 from classes where project=? and id=?", project_id, parent)
			if not parent_exists:
				continue
		mochi.db.execute(
			"insert into hierarchy (project, class, parent) values (?, ?, ?)",
			project_id, class_id, parent
		)
	broadcast_event(project_id, "hierarchy/set", {
		"project": project_id, "class": class_id, "parents": parents
	})
	return {"success": True}

# View helpers
def do_view_create(project_id, project, params):
	name = params.get("name")
	if not name or not name.strip():
		return {"error": "Name is required", "code": 400}
	viewtype = params.get("viewtype", "board")
	if viewtype not in ["board", "list"]:
		return {"error": "Invalid view type", "code": 400}
	view_id = name.strip().lower().replace(" ", "_")
	existing = mochi.db.exists("select 1 from views where project=? and id=?", project_id, view_id)
	if existing:
		return {"error": "A view with this name already exists", "code": 400}
	filter_str = params.get("filter", "")
	columns = params.get("columns", "")
	if viewtype == "board" and not columns:
		return {"error": "Columns field is required for board views", "code": 400}
	rows = params.get("rows", "")
	fields = params.get("fields", "title,priority,owner,due")
	sort = params.get("sort", "")
	direction = params.get("direction", "asc")
	next_rank = mochi.db.row("select coalesce(max(rank), -1) + 1 as r from views where project=?", project_id)
	rank = next_rank["r"] if next_rank else 0
	mochi.db.execute(
		"insert into views (project, id, name, viewtype, filter, columns, rows, sort, direction, rank) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		project_id, view_id, name.strip(), viewtype, filter_str, columns, rows, sort, direction, rank
	)
	for i, field in enumerate(fields.split(",")):
		if field.strip():
			mochi.db.execute(
				"insert into view_fields (project, view, field, rank) values (?, ?, ?, ?)",
				project_id, view_id, field.strip(), i
			)
	view_classes = params.get("classes", "")
	if view_classes:
		for cls_id in [c.strip() for c in view_classes.split(",") if c.strip()]:
			mochi.db.execute(
				"insert into view_classes (project, view, class) values (?, ?, ?)",
				project_id, view_id, cls_id
			)
	broadcast_event(project_id, "view/create", {
		"project": project_id, "id": view_id, "name": name.strip(),
		"viewtype": viewtype, "filter": filter_str, "columns": columns,
		"rows": rows, "fields": fields, "sort": sort, "direction": direction
	})
	return {"id": view_id, "name": name.strip(), "viewtype": viewtype}

def do_view_update(project_id, project, params):
	view_id = params.get("view")
	if not view_id:
		return {"error": "View ID required", "code": 400}
	view = mochi.db.row("select * from views where project=? and id=?", project_id, view_id)
	if not view:
		return {"error": "View not found", "code": 404}
	name = params.get("name")
	viewtype = params.get("viewtype")
	filter_str = params.get("filter")
	columns = params.get("columns")
	rows = params.get("rows")
	fields = params.get("fields")
	sort = params.get("sort")
	direction = params.get("direction")
	if name != None and name.strip() != "":
		mochi.db.execute("update views set name=? where project=? and id=?", name.strip(), project_id, view_id)
	if viewtype != None and viewtype != "":
		if viewtype not in ["board", "list"]:
			return {"error": "Invalid view type", "code": 400}
		mochi.db.execute("update views set viewtype=? where project=? and id=?", viewtype, project_id, view_id)
	if filter_str != None:
		mochi.db.execute("update views set filter=? where project=? and id=?", filter_str, project_id, view_id)
	if columns != None:
		mochi.db.execute("update views set columns=? where project=? and id=?", columns, project_id, view_id)
	if rows != None:
		mochi.db.execute("update views set rows=? where project=? and id=?", rows, project_id, view_id)
	if fields != None:
		mochi.db.execute("delete from view_fields where project=? and view=?", project_id, view_id)
		for i, field in enumerate(fields.split(",")):
			if field.strip():
				mochi.db.execute(
					"insert into view_fields (project, view, field, rank) values (?, ?, ?, ?)",
					project_id, view_id, field.strip(), i
				)
	if sort != None:
		mochi.db.execute("update views set sort=? where project=? and id=?", sort, project_id, view_id)
	if direction != None and direction != "":
		if direction not in ["asc", "desc"]:
			return {"error": "Invalid direction", "code": 400}
		mochi.db.execute("update views set direction=? where project=? and id=?", direction, project_id, view_id)
	view_classes_input = params.get("classes")
	if view_classes_input != None:
		mochi.db.execute("delete from view_classes where project=? and view=?", project_id, view_id)
		if view_classes_input:
			cls_ids = [c.strip() for c in view_classes_input.split(",") if c.strip()]
			for cls_id in cls_ids:
				mochi.db.execute(
					"insert into view_classes (project, view, class) values (?, ?, ?)",
					project_id, view_id, cls_id
				)
	updated = mochi.db.row("select * from views where project=? and id=?", project_id, view_id)
	if updated:
		view_fields = mochi.db.rows("select field from view_fields where project=? and view=? order by rank", project_id, view_id) or []
		updated_fields = ",".join([vf["field"] for vf in view_fields])
		broadcast_event(project_id, "view/update", {
			"project": project_id, "id": view_id,
			"name": updated["name"], "viewtype": updated["viewtype"],
			"filter": updated["filter"], "columns": updated["columns"],
			"rows": updated["rows"], "fields": updated_fields,
			"sort": updated["sort"], "direction": updated["direction"],
			"rank": updated["rank"]
		})
	return {"success": True}

def do_view_delete(project_id, project, params):
	view_id = params.get("view")
	if not view_id:
		return {"error": "View ID required", "code": 400}
	count = mochi.db.row("select count(*) as cnt from views where project=?", project_id)
	if count and count["cnt"] <= 1:
		return {"error": "Cannot delete the last view", "code": 400}
	mochi.db.execute("delete from view_fields where project=? and view=?", project_id, view_id)
	mochi.db.execute("delete from view_classes where project=? and view=?", project_id, view_id)
	mochi.db.execute("delete from views where project=? and id=?", project_id, view_id)
	broadcast_event(project_id, "view/delete", {"project": project_id, "id": view_id})
	return {"success": True}

def do_view_reorder(project_id, project, params):
	order_str = params.get("order", "")
	order = [v.strip() for v in order_str.split(",") if v.strip()]
	for i, view_id in enumerate(order):
		mochi.db.execute(
			"update views set rank=? where project=? and id=?",
			i, project_id, view_id
		)
	broadcast_event(project_id, "view/reorder", {"project": project_id, "order": order})
	return {"success": True}
