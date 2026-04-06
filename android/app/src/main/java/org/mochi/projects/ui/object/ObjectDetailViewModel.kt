package org.mochi.projects.ui.`object`

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.mochi.android.api.MochiError
import org.mochi.android.api.toMochiError
import org.mochi.android.model.Attachment
import org.mochi.android.model.Comment
import org.mochi.projects.model.Activity
import org.mochi.projects.model.Link
import org.mochi.projects.model.MergeRequest
import org.mochi.projects.model.ProjectObject
import org.mochi.projects.model.Watcher
import org.mochi.projects.repository.ProjectsRepository
import java.io.File
import javax.inject.Inject

data class ObjectDetailUiState(
    val obj: ProjectObject? = null,
    val comments: List<Comment> = emptyList(),
    val activity: List<Activity> = emptyList(),
    val requests: List<MergeRequest> = emptyList(),
    val attachments: List<Attachment> = emptyList(),
    val links: List<Link> = emptyList(),
    val watchers: List<Watcher> = emptyList(),
    val isWatching: Boolean = false,
    val isLoading: Boolean = false,
    val error: MochiError? = null,
    val selectedTab: Int = 0,
    val isSaving: Boolean = false
)

@HiltViewModel
class ObjectDetailViewModel @Inject constructor(
    private val repository: ProjectsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ObjectDetailUiState())
    val uiState: StateFlow<ObjectDetailUiState> = _uiState.asStateFlow()

    private var debounceJobs = mutableMapOf<String, Job>()
    private var currentProjectId: String = ""
    private var currentObjectId: String = ""

    fun loadWithInitialObject(projectId: String, objectId: String, initialObject: ProjectObject?) {
        currentProjectId = projectId
        currentObjectId = objectId
        if (initialObject != null) {
            _uiState.value = _uiState.value.copy(obj = initialObject)
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = _uiState.value.obj == null, error = null)
            try {
                val fetched = repository.getObject(projectId, objectId)
                // The single-object endpoint doesn't return values — merge with what we have
                val existing = _uiState.value.obj
                val merged = if (fetched.values.isEmpty() && existing != null && existing.values.isNotEmpty()) {
                    fetched.copy(values = existing.values)
                } else {
                    fetched
                }
                _uiState.value = _uiState.value.copy(obj = merged, isLoading = false)
                loadComments()
                loadActivity()
                loadRequests()
                loadAttachments()
                loadWatchers()
                loadLinks()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.toMochiError()
                )
            }
        }
    }

    fun selectTab(index: Int) {
        _uiState.value = _uiState.value.copy(selectedTab = index)
    }

    // ---- Title ----

    fun updateTitle(title: String) {
        val obj = _uiState.value.obj ?: return
        _uiState.value = _uiState.value.copy(
            obj = obj.copy(readable = title)
        )
        debounce("title") {
            try {
                repository.updateObject(currentProjectId, currentObjectId, title = title)
            } catch (_: Exception) { }
        }
    }

    // ---- Values ----

    fun setValue(fieldId: String, value: String) {
        val obj = _uiState.value.obj ?: return
        val newValues = obj.values.toMutableMap()
        newValues[fieldId] = value
        _uiState.value = _uiState.value.copy(
            obj = obj.copy(values = newValues)
        )
        debounce("value_$fieldId") {
            try {
                repository.setValue(currentProjectId, currentObjectId, fieldId, value)
            } catch (_: Exception) { }
        }
    }

    fun setMultiValue(fieldId: String, values: List<String>) {
        val obj = _uiState.value.obj ?: return
        val newVals = obj.values.toMutableMap()
        newVals[fieldId] = values
        _uiState.value = _uiState.value.copy(
            obj = obj.copy(values = newVals)
        )
        debounce("value_$fieldId") {
            try {
                repository.setValue(currentProjectId, currentObjectId, fieldId, values.joinToString(","))
            } catch (_: Exception) { }
        }
    }

    // ---- Comments ----

    private fun loadComments() {
        viewModelScope.launch {
            try {
                val comments = repository.getComments(currentProjectId, currentObjectId)
                _uiState.value = _uiState.value.copy(comments = comments)
            } catch (_: Exception) { }
        }
    }

    fun createComment(content: String, parent: String? = null, files: List<File> = emptyList()) {
        viewModelScope.launch {
            try {
                repository.createComment(currentProjectId, currentObjectId, content, parent, files)
                loadComments()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    fun updateComment(commentId: String, content: String) {
        viewModelScope.launch {
            try {
                repository.updateComment(currentProjectId, currentObjectId, commentId, content)
                loadComments()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    fun deleteComment(commentId: String) {
        viewModelScope.launch {
            try {
                repository.deleteComment(currentProjectId, currentObjectId, commentId)
                loadComments()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    // ---- Activity ----

    private fun loadActivity() {
        viewModelScope.launch {
            try {
                val activity = repository.getActivity(currentProjectId, currentObjectId)
                _uiState.value = _uiState.value.copy(activity = activity)
            } catch (_: Exception) { }
        }
    }

    // ---- Requests ----

    private fun loadRequests() {
        viewModelScope.launch {
            try {
                val requests = repository.getRequests(currentProjectId, currentObjectId)
                _uiState.value = _uiState.value.copy(requests = requests)
            } catch (_: Exception) { }
        }
    }

    fun createRequest(
        repository: String,
        source: String,
        target: String,
        title: String,
        description: String?,
        draft: Boolean
    ) {
        viewModelScope.launch {
            try {
                this@ObjectDetailViewModel.repository.createRequest(
                    currentProjectId, currentObjectId,
                    repository, source, target, title, description, draft
                )
                loadRequests()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    fun updateRequest(requestId: String, title: String?, description: String?, status: String?, draft: Boolean?) {
        viewModelScope.launch {
            try {
                repository.updateRequest(
                    currentProjectId, currentObjectId, requestId,
                    title, description, status, draft
                )
                loadRequests()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    fun deleteRequest(requestId: String) {
        viewModelScope.launch {
            try {
                repository.deleteRequest(currentProjectId, currentObjectId, requestId)
                loadRequests()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    // ---- Attachments ----

    private fun loadAttachments() {
        viewModelScope.launch {
            try {
                val attachments = repository.getAttachments(currentProjectId, currentObjectId)
                _uiState.value = _uiState.value.copy(attachments = attachments)
            } catch (_: Exception) { }
        }
    }

    fun createAttachment(file: File) {
        viewModelScope.launch {
            try {
                repository.createAttachment(currentProjectId, currentObjectId, file)
                loadAttachments()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    fun deleteAttachment(attachmentId: String) {
        viewModelScope.launch {
            try {
                repository.deleteAttachment(currentProjectId, currentObjectId, attachmentId)
                loadAttachments()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    // ---- Links ----

    private fun loadLinks() {
        viewModelScope.launch {
            try {
                val links = repository.getLinks(currentProjectId, currentObjectId)
                _uiState.value = _uiState.value.copy(links = links)
            } catch (_: Exception) { }
        }
    }

    fun createLink(target: String, linktype: String) {
        viewModelScope.launch {
            try {
                repository.createLink(currentProjectId, currentObjectId, target, linktype)
                loadLinks()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    fun deleteLink(id: String) {
        viewModelScope.launch {
            try {
                repository.deleteLink(currentProjectId, currentObjectId, id)
                loadLinks()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    // ---- Watchers ----

    private fun loadWatchers() {
        viewModelScope.launch {
            try {
                val watchers = repository.getWatchers(currentProjectId, currentObjectId)
                _uiState.value = _uiState.value.copy(
                    watchers = watchers,
                    isWatching = watchers.any { it.user > 0 }
                )
            } catch (_: Exception) { }
        }
    }

    fun toggleWatch() {
        viewModelScope.launch {
            try {
                if (_uiState.value.isWatching) {
                    repository.removeWatcher(currentProjectId, currentObjectId)
                } else {
                    repository.addWatcher(currentProjectId, currentObjectId)
                }
                loadWatchers()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    // ---- Helpers ----

    private fun debounce(key: String, delayMs: Long = 500, action: suspend () -> Unit) {
        debounceJobs[key]?.cancel()
        debounceJobs[key] = viewModelScope.launch {
            delay(delayMs)
            action()
        }
    }
}
