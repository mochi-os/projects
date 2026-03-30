package org.mochi.projects.ui.project

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.mochi.android.api.MochiError
import org.mochi.android.api.toMochiError
import org.mochi.android.auth.SessionManager
import org.mochi.android.model.WebSocketEvent
import org.mochi.android.websocket.MochiWebSocket
import org.mochi.projects.model.FieldOption
import org.mochi.projects.model.ProjectClass
import org.mochi.projects.model.ProjectDetails
import org.mochi.projects.model.ProjectField
import org.mochi.projects.model.ProjectObject
import org.mochi.projects.model.ProjectView
import org.mochi.projects.repository.ProjectsRepository
import javax.inject.Inject

data class ProjectUiState(
    val projectDetails: ProjectDetails? = null,
    val objects: List<ProjectObject> = emptyList(),
    val activeViewId: String? = null,
    val searchQuery: String = "",
    val watchedOnly: Boolean = false,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: MochiError? = null,
    val showCreateObjectDialog: Boolean = false,
    val isCreatingObject: Boolean = false,
    val selectedObjectId: String? = null
)

@HiltViewModel
class ProjectViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: ProjectsRepository,
    private val webSocket: MochiWebSocket,
    private val sessionManager: SessionManager
) : ViewModel() {

    val projectId: String = savedStateHandle.get<String>("projectId") ?: ""

    private val _uiState = MutableStateFlow(ProjectUiState())
    val uiState: StateFlow<ProjectUiState> = _uiState.asStateFlow()

    private var wsSubscriptionId: String? = null

    init {
        loadProject()
        subscribeWebSocket()
    }

    override fun onCleared() {
        super.onCleared()
        wsSubscriptionId?.let { webSocket.unsubscribe(it) }
    }

    fun loadProject() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val details = repository.getProjectInfo(projectId)
                val objects = repository.getObjects(projectId)
                val activeViewId = _uiState.value.activeViewId
                    ?: details.views.firstOrNull()?.id
                _uiState.value = _uiState.value.copy(
                    projectDetails = details,
                    objects = objects,
                    activeViewId = activeViewId,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.toMochiError()
                )
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true)
            try {
                val details = repository.getProjectInfo(projectId)
                val objects = repository.getObjects(projectId)
                _uiState.value = _uiState.value.copy(
                    projectDetails = details,
                    objects = objects,
                    isRefreshing = false,
                    error = null
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isRefreshing = false,
                    error = e.toMochiError()
                )
            }
        }
    }

    fun setActiveView(viewId: String) {
        _uiState.value = _uiState.value.copy(activeViewId = viewId)
    }

    fun updateSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
    }

    fun toggleWatchedOnly() {
        _uiState.value = _uiState.value.copy(watchedOnly = !_uiState.value.watchedOnly)
    }

    fun showCreateObjectDialog() {
        _uiState.value = _uiState.value.copy(showCreateObjectDialog = true)
    }

    fun hideCreateObjectDialog() {
        _uiState.value = _uiState.value.copy(showCreateObjectDialog = false)
    }

    fun selectObject(objectId: String?) {
        _uiState.value = _uiState.value.copy(selectedObjectId = objectId)
    }

    fun createObject(classId: String, title: String, initialValues: Map<String, String> = emptyMap()) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCreatingObject = true)
            try {
                val obj = repository.createObject(projectId, classId, null, title)
                if (initialValues.isNotEmpty()) {
                    repository.setValues(projectId, obj.id, initialValues)
                }
                _uiState.value = _uiState.value.copy(
                    isCreatingObject = false,
                    showCreateObjectDialog = false
                )
                refreshObjects()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isCreatingObject = false,
                    error = e.toMochiError()
                )
            }
        }
    }

    fun deleteObject(objectId: String) {
        viewModelScope.launch {
            try {
                repository.deleteObject(projectId, objectId)
                if (_uiState.value.selectedObjectId == objectId) {
                    _uiState.value = _uiState.value.copy(selectedObjectId = null)
                }
                refreshObjects()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    fun moveObject(objectId: String, field: String?, value: String?, rank: Int?, row: String? = null) {
        viewModelScope.launch {
            try {
                repository.moveObject(projectId, objectId, field, value, rank, row)
                refreshObjects()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.toMochiError())
            }
        }
    }

    private fun refreshObjects() {
        viewModelScope.launch {
            try {
                val objects = repository.getObjects(projectId)
                _uiState.value = _uiState.value.copy(objects = objects)
            } catch (_: Exception) { }
        }
    }

    private fun subscribeWebSocket() {
        viewModelScope.launch {
            val serverUrl = sessionManager.serverUrl.let {
                sessionManager.getServerUrlBlocking()
            }
            wsSubscriptionId = webSocket.subscribe(serverUrl, projectId) { event ->
                handleWebSocketEvent(event)
            }
        }
    }

    private fun handleWebSocketEvent(event: WebSocketEvent) {
        when (event.type) {
            "object_created", "object_updated", "object_deleted", "object_moved" -> {
                refreshObjects()
            }
            "project_updated" -> {
                loadProject()
            }
        }
    }

    // ---- Helpers for views ----

    fun getActiveView(): ProjectView? {
        val details = _uiState.value.projectDetails ?: return null
        val activeId = _uiState.value.activeViewId ?: return details.views.firstOrNull()
        return details.views.find { it.id == activeId } ?: details.views.firstOrNull()
    }

    fun getFieldById(fieldId: String): ProjectField? {
        val details = _uiState.value.projectDetails ?: return null
        for ((_, fields) in details.fields) {
            fields.find { it.id == fieldId }?.let { return it }
        }
        return null
    }

    fun getOptionsForField(classId: String, fieldId: String): List<FieldOption> {
        val details = _uiState.value.projectDetails ?: return emptyList()
        return details.options[classId]?.get(fieldId) ?: emptyList()
    }

    fun getAllOptionsForField(fieldId: String): List<FieldOption> {
        val details = _uiState.value.projectDetails ?: return emptyList()
        for ((_, classOptions) in details.options) {
            val options = classOptions[fieldId]
            if (!options.isNullOrEmpty()) return options
        }
        return emptyList()
    }

    fun getClassById(classId: String): ProjectClass? {
        return _uiState.value.projectDetails?.classes?.find { it.id == classId }
    }

    fun getFilteredObjects(): List<ProjectObject> {
        val state = _uiState.value
        val view = getActiveView() ?: return state.objects
        var objects = state.objects

        // Filter by view's class filter
        if (view.classes.isNotEmpty()) {
            objects = objects.filter { it.objectClass in view.classes }
        }

        // Filter by search query
        val query = state.searchQuery.lowercase()
        if (query.isNotBlank()) {
            objects = objects.filter {
                it.readable.lowercase().contains(query) ||
                    it.values.values.any { v -> v?.toString()?.lowercase()?.contains(query) == true }
            }
        }

        // Filter by view's filter field
        if (view.filter.isNotBlank()) {
            val parts = view.filter.split(":")
            if (parts.size == 2) {
                val filterFieldId = parts[0]
                val filterValue = parts[1]
                objects = objects.filter { it.stringValue(filterFieldId) == filterValue }
            }
        }

        // Sort
        if (view.sort.isNotBlank()) {
            objects = objects.sortedWith(compareBy<ProjectObject> {
                it.stringValue(view.sort).lowercase()
            }.let {
                if (view.direction == "desc") it.reversed() else it
            })
        }

        return objects
    }

    fun getCardFields(classId: String): List<ProjectField> {
        val details = _uiState.value.projectDetails ?: return emptyList()
        return details.fields[classId]?.filter { it.showOnCard } ?: emptyList()
    }
}
