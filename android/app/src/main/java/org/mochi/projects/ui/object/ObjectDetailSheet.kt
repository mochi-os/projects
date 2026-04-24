package org.mochi.projects.ui.`object`

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import org.mochi.android.api.userMessage
import org.mochi.projects.model.ProjectDetails

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ObjectDetailSheet(
    projectId: String,
    objectId: String,
    projectDetails: ProjectDetails,
    initialObject: org.mochi.projects.model.ProjectObject? = null,
    onDismiss: () -> Unit,
    onObjectDeleted: () -> Unit,
    onViewDiff: (String, String, String, String) -> Unit,
    viewModel: ObjectDetailViewModel = hiltViewModel()
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val uiState by viewModel.uiState.collectAsState()
    var showOverflow by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(projectId, objectId) {
        viewModel.loadWithInitialObject(projectId, objectId, initialObject)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        when {
            uiState.isLoading && uiState.obj == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            uiState.error != null && uiState.obj == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = uiState.error!!.userMessage(),
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }

            uiState.obj != null -> {
                val obj = uiState.obj!!
                val prefix = projectDetails.project.prefix
                val objClass = projectDetails.classes.find { it.id == obj.objectClass }

                Column(modifier = Modifier.fillMaxSize()) {
                    // Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = if (prefix.isNotBlank()) "$prefix-${obj.number}" else "#${obj.number}",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary
                            )
                            if (objClass != null) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = objClass.name,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        IconButton(onClick = { viewModel.toggleWatch() }) {
                            Icon(
                                imageVector = if (uiState.isWatching) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = if (uiState.isWatching) "Unwatch" else "Watch",
                                tint = if (uiState.isWatching) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
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
                                    text = { Text("Delete") },
                                    onClick = {
                                        showOverflow = false
                                        showDeleteConfirm = true
                                    },
                                    leadingIcon = {
                                        Icon(
                                            Icons.Default.Delete,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Tabs
                    val tabs = listOf("Properties", "Comments", "Activity", "Requests", "Attachments")
                    ScrollableTabRow(
                        selectedTabIndex = uiState.selectedTab,
                        edgePadding = 16.dp
                    ) {
                        tabs.forEachIndexed { index, title ->
                            Tab(
                                selected = uiState.selectedTab == index,
                                onClick = { viewModel.selectTab(index) },
                                text = { Text(title) }
                            )
                        }
                    }

                    // Tab content
                    when (uiState.selectedTab) {
                        0 -> PropertiesTab(
                            obj = obj,
                            projectDetails = projectDetails,
                            viewModel = viewModel
                        )
                        1 -> CommentsTab(
                            comments = uiState.comments,
                            onCreateComment = { content, parent ->
                                viewModel.createComment(content, parent)
                            },
                            onUpdateComment = { id, content ->
                                viewModel.updateComment(id, content)
                            },
                            onDeleteComment = { id ->
                                viewModel.deleteComment(id)
                            },
                            onSearchUsers = { query -> viewModel.searchUsers(query) },
                            avatarUrlBuilder = { comment ->
                                "${viewModel.serverUrl}/projects/$projectId/-/comment/${comment.id}/asset/avatar"
                            }
                        )
                        2 -> ActivityTab(
                            activity = uiState.activity,
                            projectDetails = projectDetails
                        )
                        3 -> RequestsTab(
                            requests = uiState.requests,
                            projectId = projectId,
                            viewModel = viewModel,
                            onViewDiff = onViewDiff
                        )
                        4 -> AttachmentsTab(
                            attachments = uiState.attachments,
                            projectId = projectId,
                            onAddAttachment = { file -> viewModel.createAttachment(file) },
                            onDeleteAttachment = { id -> viewModel.deleteAttachment(id) }
                        )
                    }
                }
            }
        }
    }

    if (showDeleteConfirm) {
        ConfirmDeleteDialog(
            title = "Delete object",
            message = "Are you sure you want to delete this object? This action cannot be undone.",
            onConfirm = {
                showDeleteConfirm = false
                onObjectDeleted()
            },
            onDismiss = { showDeleteConfirm = false }
        )
    }
}
