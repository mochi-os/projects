package org.mochi.projects.ui.project

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import org.mochi.android.api.userMessage
import org.mochi.projects.ui.board.BoardView
import org.mochi.projects.ui.`object`.ObjectDetailSheet
import org.mochi.projects.ui.tree.TreeView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectScreen(
    onBack: () -> Unit,
    onSettings: (String) -> Unit,
    onDesign: (String) -> Unit,
    onViewDiff: (String, String, String, String) -> Unit,
    initialObjectId: String? = null,
    viewModel: ProjectViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showOverflow by remember { mutableStateOf(false) }
    var showSearch by remember { mutableStateOf(false) }

    LaunchedEffect(initialObjectId) {
        if (initialObjectId != null) {
            viewModel.selectObject(initialObjectId)
        }
    }

    val details = uiState.projectDetails
    val activeView = viewModel.getActiveView()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = details?.project?.name ?: "Loading...",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showSearch = !showSearch }) {
                        Icon(
                            if (showSearch) Icons.Default.Close else Icons.Default.Search,
                            contentDescription = "Search"
                        )
                    }
                    Box {
                        IconButton(onClick = { showOverflow = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "More")
                        }
                        DropdownMenu(
                            expanded = showOverflow,
                            onDismissRequest = { showOverflow = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Settings") },
                                onClick = {
                                    showOverflow = false
                                    onSettings(viewModel.projectId)
                                },
                                leadingIcon = { Icon(Icons.Default.Settings, contentDescription = null) }
                            )
                            DropdownMenuItem(
                                text = { Text("Design") },
                                onClick = {
                                    showOverflow = false
                                    onDesign(viewModel.projectId)
                                },
                                leadingIcon = { Icon(Icons.Default.Tune, contentDescription = null) }
                            )
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            if (details != null) {
                FloatingActionButton(onClick = { viewModel.showCreateObjectDialog() }) {
                    Icon(Icons.Default.Add, contentDescription = "Create object")
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // View tabs
            if (details != null && details.views.isNotEmpty()) {
                val views = details.views
                val selectedIndex = views.indexOfFirst { it.id == uiState.activeViewId }.coerceAtLeast(0)
                ScrollableTabRow(
                    selectedTabIndex = selectedIndex,
                    edgePadding = 16.dp
                ) {
                    views.forEachIndexed { index, view ->
                        Tab(
                            selected = index == selectedIndex,
                            onClick = { viewModel.setActiveView(view.id) },
                            text = {
                                Text(
                                    text = view.name,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        )
                    }
                }
            }

            // Search and filter bar
            if (showSearch) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = uiState.searchQuery,
                        onValueChange = viewModel::updateSearchQuery,
                        placeholder = { Text("Search objects") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    FilterChip(
                        selected = uiState.watchedOnly,
                        onClick = { viewModel.toggleWatchedOnly() },
                        label = { Text("Watched") },
                        leadingIcon = if (uiState.watchedOnly) {
                            { Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp)) }
                        } else null
                    )
                }
            }

            // Main content
            when {
                uiState.isLoading && details == null -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }

                uiState.error != null && details == null -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = uiState.error!!.userMessage(),
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }

                details != null -> {
                    PullToRefreshBox(
                        isRefreshing = uiState.isRefreshing,
                        onRefresh = { viewModel.refresh() },
                        modifier = Modifier.fillMaxSize()
                    ) {
                        val filteredObjects = viewModel.getFilteredObjects()
                        val allObjects = uiState.objects
                        when (activeView?.viewtype) {
                            "board" -> {
                                BoardView(
                                    objects = allObjects,
                                    view = activeView,
                                    viewModel = viewModel,
                                    onObjectClick = { viewModel.selectObject(it) },
                                    onCreateObject = { classId, title, initialValues ->
                                        viewModel.createObject(classId, title, initialValues)
                                    }
                                )
                            }
                            else -> {
                                TreeView(
                                    objects = filteredObjects,
                                    view = activeView,
                                    viewModel = viewModel,
                                    onObjectClick = { viewModel.selectObject(it) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Create object dialog
    if (uiState.showCreateObjectDialog && details != null) {
        CreateObjectDialog(
            classes = details.classes,
            isCreating = uiState.isCreatingObject,
            activeView = activeView,
            viewModel = viewModel,
            onDismiss = { viewModel.hideCreateObjectDialog() },
            onCreate = { classId, title, initialValues ->
                viewModel.createObject(classId, title, initialValues)
            }
        )
    }

    // Object detail sheet
    if (uiState.selectedObjectId != null && details != null) {
        ObjectDetailSheet(
            projectId = viewModel.projectId,
            objectId = uiState.selectedObjectId!!,
            projectDetails = details,
            initialObject = uiState.objects.find { it.id == uiState.selectedObjectId },
            onDismiss = { viewModel.selectObject(null) },
            onObjectDeleted = {
                viewModel.selectObject(null)
                viewModel.refresh()
            },
            onViewDiff = onViewDiff
        )
    }
}
