package org.mochi.projects.ui.`object`

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.mochi.projects.model.Branch
import org.mochi.projects.model.MergeCheck
import org.mochi.projects.model.MergeRequest
import org.mochi.projects.model.Repository

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RequestsTab(
    requests: List<MergeRequest>,
    projectId: String,
    viewModel: ObjectDetailViewModel,
    onViewDiff: (String, String, String, String) -> Unit
) {
    var showCreateDialog by remember { mutableStateOf(false) }
    var selectedRequest by remember { mutableStateOf<MergeRequest?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        if (requests.isEmpty() && selectedRequest == null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No merge requests",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else if (selectedRequest != null) {
            RequestDetailView(
                request = selectedRequest!!,
                projectId = projectId,
                viewModel = viewModel,
                onBack = { selectedRequest = null },
                onViewDiff = onViewDiff
            )
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(requests, key = { it.id }) { request ->
                    RequestItem(
                        request = request,
                        onClick = { selectedRequest = request },
                        onDelete = { viewModel.deleteRequest(request.id) }
                    )
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                }
            }
        }

        FloatingActionButton(
            onClick = { showCreateDialog = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "New merge request")
        }
    }

    if (showCreateDialog) {
        CreateRequestDialog(
            viewModel = viewModel,
            onDismiss = { showCreateDialog = false },
            onCreate = { repo, source, target, title, description, draft ->
                viewModel.createRequest(repo, source, target, title, description, draft)
                showCreateDialog = false
            }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RequestItem(
    request: MergeRequest,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    var showOverflow by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = request.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                StatusChip(status = request.status, draft = request.draft)
                Text(
                    text = "${request.source} -> ${request.target}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
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
                        onDelete()
                    },
                    leadingIcon = {
                        Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                    }
                )
            }
        }
    }
}

@Composable
private fun StatusChip(status: String, draft: Boolean) {
    val (label, color) = when {
        draft -> "Draft" to MaterialTheme.colorScheme.outlineVariant
        status == "open" -> "Open" to Color(0xFF4CAF50)
        status == "merged" -> "Merged" to Color(0xFF9C27B0)
        status == "closed" -> "Closed" to Color(0xFFF44336)
        else -> status.replaceFirstChar { it.uppercase() } to MaterialTheme.colorScheme.outlineVariant
    }
    SuggestionChip(
        onClick = { },
        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
        colors = SuggestionChipDefaults.suggestionChipColors(
            containerColor = color.copy(alpha = 0.15f)
        )
    )
}

@Composable
private fun RequestDetailView(
    request: MergeRequest,
    projectId: String,
    viewModel: ObjectDetailViewModel,
    onBack: () -> Unit,
    onViewDiff: (String, String, String, String) -> Unit
) {
    val mergeCheck by viewModel.mergeCheck.collectAsState()
    val isCheckingMerge by viewModel.isCheckingMerge.collectAsState()
    val mergeSuccess by viewModel.mergeSuccess.collectAsState()
    var showMergeDialog by remember { mutableStateOf(false) }

    LaunchedEffect(request.id) {
        viewModel.clearMergeState()
        if (request.status == "open" && !request.draft) {
            viewModel.checkMerge(request.repository, request.source, request.target)
        }
    }

    LaunchedEffect(mergeSuccess) {
        if (mergeSuccess) {
            onBack()
            viewModel.clearMergeState()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        TextButton(onClick = onBack) {
            Text("Back to list")
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = request.title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(8.dp))

        StatusChip(status = request.status, draft = request.draft)

        Spacer(modifier = Modifier.height(12.dp))

        if (request.description.isNotBlank()) {
            Text(
                text = request.description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text("Repository: ${request.repository}", style = MaterialTheme.typography.bodySmall)
                Text("Source: ${request.source}", style = MaterialTheme.typography.bodySmall)
                Text("Target: ${request.target}", style = MaterialTheme.typography.bodySmall)
            }
        }

        // Merge check status
        if (request.status == "open" && !request.draft) {
            Spacer(modifier = Modifier.height(12.dp))
            when {
                isCheckingMerge -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Checking merge status...", style = MaterialTheme.typography.bodySmall)
                    }
                }
                mergeCheck != null -> {
                    val check = mergeCheck!!
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = if (check.canMerge) "\u2705" else "\u274C",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (check.canMerge) "Can be merged" else "Cannot merge",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium,
                            color = if (check.canMerge) Color(0xFF4CAF50) else MaterialTheme.colorScheme.error
                        )
                    }
                    if (check.ahead > 0 || check.behind > 0) {
                        Text(
                            text = "${check.ahead} ahead, ${check.behind} behind",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    // Conflict list
                    if (check.conflicts.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "${check.conflicts.size} conflicting file${if (check.conflicts.size != 1) "s" else ""}",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.error
                        )
                        check.conflicts.forEach { file ->
                            Text(
                                text = file,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(start = 8.dp)
                            )
                        }
                    }
                }
            }
        }

        if (request.draft && request.status == "open") {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "This is a draft. Mark as ready before merging.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = {
                onViewDiff(projectId, request.repository, request.source, request.target)
            }) {
                Text("View diff")
            }

            if (request.status == "open" && !request.draft && mergeCheck?.canMerge == true) {
                TextButton(onClick = { showMergeDialog = true }) {
                    Text("Merge", color = Color(0xFF4CAF50))
                }
            }

            if (request.status == "open" && request.draft) {
                TextButton(onClick = {
                    viewModel.updateRequest(request.id, null, null, null, false)
                }) {
                    Text("Mark as ready")
                }
            }

            if (request.status == "open") {
                TextButton(onClick = {
                    viewModel.updateRequest(request.id, null, null, "closed", null)
                }) {
                    Text("Close")
                }
            }
        }
    }

    if (showMergeDialog) {
        MergeDialog(
            request = request,
            onDismiss = { showMergeDialog = false },
            onMerge = { message, method ->
                showMergeDialog = false
                viewModel.performMerge(
                    request.repository, request.source, request.target,
                    message, method, request.id
                )
            }
        )
    }
}

@Composable
private fun MergeDialog(
    request: MergeRequest,
    onDismiss: () -> Unit,
    onMerge: (message: String, method: String) -> Unit
) {
    var message by remember { mutableStateOf("Merge ${request.source} into ${request.target}") }
    var method by remember { mutableStateOf("merge") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Merge") },
        text = {
            Column {
                OutlinedTextField(
                    value = message,
                    onValueChange = { message = it },
                    label = { Text("Commit message") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text("Method", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("merge", "squash", "rebase").forEach { m ->
                        SuggestionChip(
                            onClick = { method = m },
                            label = { Text(m.replaceFirstChar { it.uppercase() }) },
                            colors = SuggestionChipDefaults.suggestionChipColors(
                                containerColor = if (method == m) MaterialTheme.colorScheme.primaryContainer
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onMerge(message, method) },
                enabled = message.isNotBlank()
            ) {
                Text("Merge")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateRequestDialog(
    viewModel: ObjectDetailViewModel,
    onDismiss: () -> Unit,
    onCreate: (String, String, String, String, String?, Boolean) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var draft by remember { mutableStateOf(false) }
    var selectedRepo by remember { mutableStateOf("") }
    var selectedSource by remember { mutableStateOf("") }
    var selectedTarget by remember { mutableStateOf("") }
    var repositories by remember { mutableStateOf<List<Repository>>(emptyList()) }
    var branches by remember { mutableStateOf<List<Branch>>(emptyList()) }
    var repoExpanded by remember { mutableStateOf(false) }
    var sourceExpanded by remember { mutableStateOf(false) }
    var targetExpanded by remember { mutableStateOf(false) }
    var isLoadingRepos by remember { mutableStateOf(true) }

    // Load repositories lazily - we cannot call the repository directly,
    // but since this is a dialog composed alongside the viewModel we can use a side effect
    // The repos/branches are loaded from the ProjectsRepository at the class level
    // For simplicity, we just show text fields for repo/branch names
    // A full implementation would load these from the API

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create merge request") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                OutlinedTextField(
                    value = selectedRepo,
                    onValueChange = { selectedRepo = it },
                    label = { Text("Repository") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = selectedSource,
                    onValueChange = { selectedSource = it },
                    label = { Text("Source branch") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = selectedTarget,
                    onValueChange = { selectedTarget = it },
                    label = { Text("Target branch") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Title") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    maxLines = 4,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = draft,
                        onCheckedChange = { draft = it }
                    )
                    Text("Draft")
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onCreate(
                        selectedRepo,
                        selectedSource,
                        selectedTarget,
                        title,
                        description.ifBlank { null },
                        draft
                    )
                },
                enabled = title.isNotBlank() && selectedRepo.isNotBlank() &&
                    selectedSource.isNotBlank() && selectedTarget.isNotBlank()
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
