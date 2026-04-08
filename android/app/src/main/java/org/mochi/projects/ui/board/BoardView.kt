package org.mochi.projects.ui.board

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.mochi.projects.model.FieldOption
import org.mochi.projects.model.ProjectObject
import org.mochi.projects.model.ProjectView
import org.mochi.projects.ui.project.ProjectViewModel

@Composable
fun BoardView(
    objects: List<ProjectObject>,
    view: ProjectView?,
    viewModel: ProjectViewModel,
    onObjectClick: (String) -> Unit,
    onCreateObject: ((classId: String, title: String, initialValues: Map<String, String>) -> Unit)? = null
) {
    if (view == null || view.columns.isBlank()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                text = "No columns configured for this view",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }

    val columnFieldId = view.columns
    val columnOptions = viewModel.getAllOptionsForField(columnFieldId)
    val rowFieldId = view.rows.takeIf { it.isNotBlank() }
    val rowOptions = rowFieldId?.let { viewModel.getAllOptionsForField(it) } ?: emptyList()
    val borderFieldId = view.border.takeIf { it.isNotBlank() }

    // Build parent-child map from all objects
    val childrenByParent = remember(objects) {
        val map = mutableMapOf<String, MutableList<ProjectObject>>()
        val objectIds = objects.map { it.id }.toSet()
        for (obj in objects) {
            if (obj.parent.isNotBlank() && obj.parent in objectIds) {
                map.getOrPut(obj.parent) { mutableListOf() }.add(obj)
            }
        }
        map
    }

    // Only show top-level objects (no parent in this set) that match the view's class filter
    val filteredObjects = objects.filter { obj ->
        (obj.parent.isBlank() || obj.parent !in objects.map { it.id }.toSet()) &&
            (view.classes.isEmpty() || obj.objectClass in view.classes)
    }

    if (columnOptions.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                text = "No options configured for column field",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }

    // Group objects by column value
    val objectsByColumn = columnOptions.associate { option ->
        option.id to filteredObjects.filter { obj ->
            obj.stringValue(columnFieldId) == option.id ||
                obj.listValue(columnFieldId).contains(option.id)
        }
    }

    // Add unassigned column
    val assignedIds = objectsByColumn.values.flatten().map { it.id }.toSet()
    val unassigned = filteredObjects.filter { it.id !in assignedIds }

    LazyRow(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(columnOptions, key = { it.id }) { columnOption ->
            val columnObjects = objectsByColumn[columnOption.id] ?: emptyList()
            BoardColumn(
                option = columnOption,
                objects = columnObjects,
                viewModel = viewModel,
                columnFieldId = columnFieldId,
                rowFieldId = rowFieldId,
                rowOptions = rowOptions,
                borderFieldId = borderFieldId,
                childrenByParent = childrenByParent,
                onObjectClick = onObjectClick,
                onMoveObject = { objectId, rank ->
                    viewModel.moveObject(objectId, columnFieldId, columnOption.id, rank)
                },
                onRename = { newName -> viewModel.renameColumnOption(columnFieldId, columnOption.id, newName) },
                onDelete = { viewModel.deleteColumnOption(columnFieldId, columnOption.id) },
                onCreateInColumn = if (onCreateObject != null) {
                    {
                        val details = viewModel.uiState.value.projectDetails
                        val classId = view.classes.firstOrNull() ?: details?.classes?.firstOrNull()?.id ?: ""
                        if (classId.isNotBlank()) {
                            onCreateObject(classId, "", mapOf(columnFieldId to columnOption.id))
                        }
                    }
                } else null
            )
        }

        if (unassigned.isNotEmpty()) {
            item {
                BoardColumn(
                    option = FieldOption(id = "", name = "Unassigned", colour = ""),
                    objects = unassigned,
                    viewModel = viewModel,
                    columnFieldId = columnFieldId,
                    rowFieldId = rowFieldId,
                    rowOptions = rowOptions,
                    borderFieldId = borderFieldId,
                    childrenByParent = childrenByParent,
                    onObjectClick = onObjectClick,
                    onMoveObject = { _, _ -> },
                    onRename = null,
                    onDelete = null
                )
            }
        }

    }
}


@Composable
private fun BoardColumn(
    option: FieldOption,
    objects: List<ProjectObject>,
    viewModel: ProjectViewModel,
    columnFieldId: String,
    rowFieldId: String?,
    rowOptions: List<FieldOption>,
    borderFieldId: String?,
    childrenByParent: Map<String, List<ProjectObject>>,
    onObjectClick: (String) -> Unit,
    onMoveObject: (String, Int) -> Unit,
    onRename: ((String) -> Unit)? = null,
    onDelete: (() -> Unit)? = null,
    onCreateInColumn: (() -> Unit)? = null
) {
    var collapsed by rememberSaveable(option.id) { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .width(if (collapsed) 48.dp else 280.dp)
            .fillMaxHeight()
            .background(
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                MaterialTheme.shapes.medium
            )
            .padding(8.dp)
    ) {
        // Column header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)
        ) {
            Icon(
                imageVector = if (collapsed) Icons.Default.ChevronRight else Icons.Default.ExpandMore,
                contentDescription = if (collapsed) "Expand" else "Collapse",
                modifier = Modifier
                    .size(18.dp)
                    .clickable { collapsed = !collapsed },
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (!collapsed) {
                if (option.colour.isNotBlank()) {
                    Spacer(modifier = Modifier.width(4.dp))
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(parseColor(option.colour))
                    )
                }
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = option.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "${objects.size}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (onCreateInColumn != null) {
                    IconButton(
                        onClick = onCreateInColumn,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "New",
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                if (onRename != null || onDelete != null) {
                    var showMenu by remember { mutableStateOf(false) }
                    var showRenameDialog by remember { mutableStateOf(false) }
                    Box {
                        IconButton(
                            onClick = { showMenu = true },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.ExpandMore,
                                contentDescription = "Column options",
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            if (onRename != null) {
                                DropdownMenuItem(
                                    text = { Text("Rename") },
                                    onClick = {
                                        showMenu = false
                                        showRenameDialog = true
                                    }
                                )
                            }
                            if (onDelete != null) {
                                DropdownMenuItem(
                                    text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                                    onClick = {
                                        showMenu = false
                                        onDelete()
                                    }
                                )
                            }
                        }
                    }
                    if (showRenameDialog && onRename != null) {
                        var newName by remember { mutableStateOf(option.name) }
                        AlertDialog(
                            onDismissRequest = { showRenameDialog = false },
                            title = { Text("Rename column") },
                            text = {
                                OutlinedTextField(
                                    value = newName,
                                    onValueChange = { newName = it },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            },
                            confirmButton = {
                                TextButton(
                                    onClick = {
                                        onRename(newName)
                                        showRenameDialog = false
                                    },
                                    enabled = newName.isNotBlank()
                                ) { Text("Rename") }
                            },
                            dismissButton = {
                                TextButton(onClick = { showRenameDialog = false }) { Text("Cancel") }
                            }
                        )
                    }
                }
            }
        }

        if (collapsed) return@Column

        // Column body
        if (rowFieldId != null && rowOptions.isNotEmpty()) {
            // Swimlane mode
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                rowOptions.forEach { rowOption ->
                    val rowObjects = objects.filter { obj ->
                        obj.stringValue(rowFieldId) == rowOption.id ||
                            obj.listValue(rowFieldId).contains(rowOption.id)
                    }.sortedBy { it.rank }

                    item(key = "header_${rowOption.id}") {
                        Text(
                            text = rowOption.name,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)
                        )
                    }
                    items(rowObjects, key = { it.id }) { obj ->
                        BoardCard(
                            obj = obj,
                            viewModel = viewModel,
                            borderFieldId = borderFieldId,
                            childrenByParent = childrenByParent,
                            columnFieldId = columnFieldId,
                            rowFieldId = rowFieldId,
                            onClick = { onObjectClick(obj.id) }
                        )
                    }
                    item(key = "spacer_${rowOption.id}") {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }

                // Unassigned row items
                val rowAssignedIds = rowOptions.flatMap { rowOpt ->
                    objects.filter { obj ->
                        obj.stringValue(rowFieldId) == rowOpt.id ||
                            obj.listValue(rowFieldId).contains(rowOpt.id)
                    }.map { it.id }
                }.toSet()
                val unassignedRow = objects.filter { it.id !in rowAssignedIds }.sortedBy { it.rank }
                if (unassignedRow.isNotEmpty()) {
                    item(key = "header_unassigned_row") {
                        Text(
                            text = "Unassigned",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)
                        )
                    }
                    items(unassignedRow, key = { it.id }) { obj ->
                        BoardCard(
                            obj = obj,
                            viewModel = viewModel,
                            borderFieldId = borderFieldId,
                            childrenByParent = childrenByParent,
                            columnFieldId = columnFieldId,
                            rowFieldId = rowFieldId,
                            onClick = { onObjectClick(obj.id) }
                        )
                    }
                }
            }
        } else {
            // Simple list mode
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                val sortedObjects = objects.sortedBy { it.rank }
                items(sortedObjects, key = { it.id }) { obj ->
                    BoardCard(
                        obj = obj,
                        viewModel = viewModel,
                        borderFieldId = borderFieldId,
                        childrenByParent = childrenByParent,
                        onClick = { onObjectClick(obj.id) }
                    )
                }
            }
        }
    }
}

fun parseColor(hex: String): Color {
    return try {
        val cleaned = hex.removePrefix("#")
        when (cleaned.length) {
            6 -> Color(android.graphics.Color.parseColor("#$cleaned"))
            8 -> Color(android.graphics.Color.parseColor("#$cleaned"))
            3 -> {
                val expanded = cleaned.map { "$it$it" }.joinToString("")
                Color(android.graphics.Color.parseColor("#$expanded"))
            }
            else -> Color.Gray
        }
    } catch (_: Exception) {
        Color.Gray
    }
}
