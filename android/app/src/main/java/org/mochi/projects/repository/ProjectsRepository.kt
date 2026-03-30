package org.mochi.projects.repository

import com.google.gson.JsonObject
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.mochi.android.api.unwrap
import org.mochi.android.model.AccessRule
import org.mochi.android.model.Attachment
import org.mochi.android.model.Comment
import org.mochi.projects.api.ProjectsApi
import org.mochi.projects.model.Activity
import org.mochi.projects.model.Branch
import org.mochi.projects.model.FieldOption
import org.mochi.projects.model.Group
import org.mochi.projects.model.Link
import org.mochi.projects.model.MergeCheck
import org.mochi.projects.model.MergeRequest
import org.mochi.projects.model.Person
import org.mochi.projects.model.Project
import org.mochi.projects.model.ProjectClass
import org.mochi.projects.model.ProjectDetails
import org.mochi.projects.model.ProjectField
import org.mochi.projects.model.ProjectObject
import org.mochi.projects.model.ProjectView
import org.mochi.projects.model.Repository
import org.mochi.projects.model.Template
import org.mochi.projects.model.Watcher
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProjectsRepository @Inject constructor(
    private val api: ProjectsApi
) {
    // ---- Projects ----

    suspend fun listProjects(): List<Project> =
        api.listProjects().unwrap().projects

    suspend fun createProject(
        name: String,
        description: String? = null,
        prefix: String? = null,
        privacy: String = "private",
        template: String? = null
    ): Project = api.createProject(name, description, prefix, privacy, template).unwrap().project

    suspend fun getTemplates(): List<Template> =
        api.getTemplates().unwrap().templates

    suspend fun searchDirectory(query: String): List<Project> =
        api.searchDirectory(query).unwrap().projects

    suspend fun getRecommendations(): List<Project> =
        api.getRecommendations().unwrap().projects

    suspend fun probe(url: String): Project =
        api.probe(url).unwrap().project

    suspend fun subscribe(project: String, server: String? = null) {
        api.subscribe(project, server).unwrap()
    }

    suspend fun unsubscribe(project: String, server: String? = null) {
        api.unsubscribe(project, server).unwrap()
    }

    suspend fun checkNotifications(): Boolean =
        api.checkNotifications().unwrap().exists

    suspend fun searchUsers(query: String): List<Person> =
        api.searchUsers(query).unwrap().users

    suspend fun getGroups(): List<Group> =
        api.getGroups().unwrap().groups

    suspend fun getRepositories(): List<Repository> =
        api.getRepositories().unwrap().repositories

    suspend fun getBranches(repo: String): List<Branch> =
        api.getBranches(repo).unwrap().branches

    suspend fun checkMerge(repo: String, source: String, target: String): MergeCheck {
        val r = api.checkMerge(repo, source, target).unwrap()
        return MergeCheck(
            mergeable = r.mergeable,
            conflicts = r.conflicts,
            ahead = r.ahead,
            behind = r.behind
        )
    }

    suspend fun getDiff(repo: String, source: String, target: String): String =
        api.getDiff(repo, source, target).unwrap().diff

    suspend fun merge(repo: String, source: String, target: String, message: String) {
        api.merge(repo, source, target, message).unwrap()
    }

    suspend fun getDiffPreference(): String =
        api.getDiffPreference().unwrap().preference

    suspend fun setDiffPreference(preference: String) {
        api.setDiffPreference(preference).unwrap()
    }

    // ---- Project Info ----

    suspend fun getProjectInfo(projectId: String): ProjectDetails {
        val r = api.getProjectInfo(projectId).unwrap()
        return ProjectDetails(
            project = r.project,
            classes = r.classes,
            fields = r.fields,
            options = r.options,
            views = r.views,
            hierarchy = r.hierarchy
        )
    }

    suspend fun updateProject(projectId: String, name: String? = null, description: String? = null, prefix: String? = null) {
        api.updateProject(projectId, name, description, prefix).unwrap()
    }

    suspend fun deleteProject(projectId: String) {
        api.deleteProject(projectId).unwrap()
    }

    suspend fun getPeople(projectId: String): List<Person> =
        api.getPeople(projectId).unwrap().people

    suspend fun getAccess(projectId: String): List<AccessRule> =
        api.getAccess(projectId).unwrap().rules

    suspend fun setAccess(projectId: String, subject: String, operation: String) {
        api.setAccess(projectId, subject, operation).unwrap()
    }

    suspend fun revokeAccess(projectId: String, id: Int) {
        api.revokeAccess(projectId, id).unwrap()
    }

    // ---- Objects ----

    suspend fun getObjects(projectId: String): List<ProjectObject> =
        api.getObjects(projectId).unwrap().objects

    suspend fun createObject(projectId: String, classId: String, parent: String? = null, title: String): ProjectObject =
        api.createObject(projectId, classId, parent, title).unwrap().`object`

    suspend fun getObject(projectId: String, objectId: String): ProjectObject =
        api.getObject(projectId, objectId).unwrap().`object`

    suspend fun updateObject(projectId: String, objectId: String, title: String? = null, parent: String? = null) {
        api.updateObject(projectId, objectId, title, parent).unwrap()
    }

    suspend fun deleteObject(projectId: String, objectId: String) {
        api.deleteObject(projectId, objectId).unwrap()
    }

    suspend fun moveObject(projectId: String, objectId: String, field: String? = null, value: String? = null, rank: Int? = null, row: String? = null) {
        api.moveObject(projectId, objectId, field, value, rank, row).unwrap()
    }

    suspend fun setValues(projectId: String, objectId: String, values: Map<String, String>) {
        api.setValues(projectId, objectId, values).unwrap()
    }

    suspend fun setValue(projectId: String, objectId: String, fieldId: String, value: String) {
        api.setValue(projectId, objectId, fieldId, value).unwrap()
    }

    // ---- Links ----

    suspend fun getLinks(projectId: String, objectId: String): List<Link> =
        api.getLinks(projectId, objectId).unwrap().links

    suspend fun createLink(projectId: String, objectId: String, target: String, linktype: String): Link =
        api.createLink(projectId, objectId, target, linktype).unwrap().link

    suspend fun deleteLink(projectId: String, objectId: String, id: String) {
        api.deleteLink(projectId, objectId, id).unwrap()
    }

    // ---- Comments ----

    suspend fun getComments(projectId: String, objectId: String): List<Comment> =
        api.getComments(projectId, objectId).unwrap().comments

    suspend fun createComment(projectId: String, objectId: String, content: String, parent: String? = null, files: List<File> = emptyList()): Comment {
        val contentBody = content.toRequestBody("text/plain".toMediaTypeOrNull())
        val parentBody = parent?.toRequestBody("text/plain".toMediaTypeOrNull())
        val fileParts = files.map { file ->
            val requestFile = file.asRequestBody("application/octet-stream".toMediaTypeOrNull())
            MultipartBody.Part.createFormData("file", file.name, requestFile)
        }
        return api.createComment(projectId, objectId, contentBody, parentBody, fileParts).unwrap().comment
    }

    suspend fun updateComment(projectId: String, objectId: String, commentId: String, content: String) {
        api.updateComment(projectId, objectId, commentId, content).unwrap()
    }

    suspend fun deleteComment(projectId: String, objectId: String, commentId: String) {
        api.deleteComment(projectId, objectId, commentId).unwrap()
    }

    // ---- Attachments ----

    suspend fun getAttachments(projectId: String, objectId: String): List<Attachment> =
        api.getAttachments(projectId, objectId).unwrap().attachments

    suspend fun createAttachment(projectId: String, objectId: String, file: File): Attachment {
        val requestFile = file.asRequestBody("application/octet-stream".toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("file", file.name, requestFile)
        return api.createAttachment(projectId, objectId, part).unwrap().attachment
    }

    suspend fun deleteAttachment(projectId: String, objectId: String, attachmentId: String) {
        api.deleteAttachment(projectId, objectId, attachmentId).unwrap()
    }

    // ---- Merge Requests ----

    suspend fun getRequests(projectId: String, objectId: String): List<MergeRequest> =
        api.getRequests(projectId, objectId).unwrap().requests

    suspend fun createRequest(
        projectId: String,
        objectId: String,
        repository: String,
        source: String,
        target: String,
        title: String,
        description: String? = null,
        draft: Boolean? = null
    ): MergeRequest = api.createRequest(projectId, objectId, repository, source, target, title, description, draft).unwrap().request

    suspend fun updateRequest(
        projectId: String,
        objectId: String,
        requestId: String,
        title: String? = null,
        description: String? = null,
        status: String? = null,
        draft: Boolean? = null
    ) {
        api.updateRequest(projectId, objectId, requestId, title, description, status, draft).unwrap()
    }

    suspend fun deleteRequest(projectId: String, objectId: String, requestId: String) {
        api.deleteRequest(projectId, objectId, requestId).unwrap()
    }

    // ---- Activity ----

    suspend fun getActivity(projectId: String, objectId: String): List<Activity> =
        api.getActivity(projectId, objectId).unwrap().activity

    // ---- Watchers ----

    suspend fun getWatchers(projectId: String, objectId: String): List<Watcher> =
        api.getWatchers(projectId, objectId).unwrap().watchers

    suspend fun addWatcher(projectId: String, objectId: String) {
        api.addWatcher(projectId, objectId).unwrap()
    }

    suspend fun removeWatcher(projectId: String, objectId: String) {
        api.removeWatcher(projectId, objectId).unwrap()
    }

    // ---- Design ----

    suspend fun exportDesign(projectId: String): JsonObject =
        api.exportDesign(projectId).unwrap().design

    suspend fun importDesign(projectId: String, design: String? = null, template: String? = null) {
        api.importDesign(projectId, design, template).unwrap()
    }

    // ---- Views ----

    suspend fun getViews(projectId: String): List<ProjectView> =
        api.getViews(projectId).unwrap().views

    suspend fun createView(
        projectId: String,
        name: String,
        viewtype: String,
        columns: String? = null,
        rows: String? = null,
        filter: String? = null,
        sort: String? = null,
        direction: String? = null,
        classes: String? = null,
        border: String? = null
    ): ProjectView = api.createView(projectId, name, viewtype, columns, rows, filter, sort, direction, classes, border).unwrap().view

    suspend fun reorderViews(projectId: String, order: String) {
        api.reorderViews(projectId, order).unwrap()
    }

    suspend fun updateView(
        projectId: String,
        viewId: String,
        name: String? = null,
        viewtype: String? = null,
        columns: String? = null,
        rows: String? = null,
        filter: String? = null,
        sort: String? = null,
        direction: String? = null,
        classes: String? = null,
        border: String? = null
    ) {
        api.updateView(projectId, viewId, name, viewtype, columns, rows, filter, sort, direction, classes, border).unwrap()
    }

    suspend fun deleteView(projectId: String, viewId: String) {
        api.deleteView(projectId, viewId).unwrap()
    }

    // ---- Classes ----

    suspend fun getClasses(projectId: String): List<ProjectClass> =
        api.getClasses(projectId).unwrap().classes

    suspend fun createClass(projectId: String, name: String): ProjectClass =
        api.createClass(projectId, name).unwrap().`class`

    suspend fun updateClass(projectId: String, classId: String, name: String) {
        api.updateClass(projectId, classId, name).unwrap()
    }

    suspend fun deleteClass(projectId: String, classId: String) {
        api.deleteClass(projectId, classId).unwrap()
    }

    // ---- Hierarchy ----

    suspend fun getHierarchy(projectId: String, classId: String): List<String> =
        api.getHierarchy(projectId, classId).unwrap().parents

    suspend fun setHierarchy(projectId: String, classId: String, parents: String) {
        api.setHierarchy(projectId, classId, parents).unwrap()
    }

    // ---- Fields ----

    suspend fun getFields(projectId: String, classId: String): List<ProjectField> =
        api.getFields(projectId, classId).unwrap().fields

    suspend fun createField(
        projectId: String,
        classId: String,
        name: String,
        fieldtype: String,
        flags: String? = null,
        multi: Boolean? = null
    ): ProjectField = api.createField(projectId, classId, name, fieldtype, flags, multi).unwrap().field

    suspend fun reorderFields(projectId: String, classId: String, order: String) {
        api.reorderFields(projectId, classId, order).unwrap()
    }

    suspend fun updateField(
        projectId: String,
        classId: String,
        fieldId: String,
        name: String? = null,
        fieldtype: String? = null,
        flags: String? = null,
        multi: Boolean? = null,
        card: Boolean? = null,
        position: String? = null,
        rows: Int? = null
    ) {
        api.updateField(projectId, classId, fieldId, name, fieldtype, flags, multi, card, position, rows).unwrap()
    }

    suspend fun deleteField(projectId: String, classId: String, fieldId: String) {
        api.deleteField(projectId, classId, fieldId).unwrap()
    }

    // ---- Options ----

    suspend fun getOptions(projectId: String, classId: String, fieldId: String): List<FieldOption> =
        api.getOptions(projectId, classId, fieldId).unwrap().options

    suspend fun createOption(
        projectId: String,
        classId: String,
        fieldId: String,
        name: String,
        colour: String? = null
    ): FieldOption = api.createOption(projectId, classId, fieldId, name, colour).unwrap().option

    suspend fun reorderOptions(projectId: String, classId: String, fieldId: String, order: String) {
        api.reorderOptions(projectId, classId, fieldId, order).unwrap()
    }

    suspend fun updateOption(
        projectId: String,
        classId: String,
        fieldId: String,
        optionId: String,
        name: String? = null,
        colour: String? = null,
        icon: String? = null
    ) {
        api.updateOption(projectId, classId, fieldId, optionId, name, colour, icon).unwrap()
    }

    suspend fun deleteOption(projectId: String, classId: String, fieldId: String, optionId: String) {
        api.deleteOption(projectId, classId, fieldId, optionId).unwrap()
    }
}
