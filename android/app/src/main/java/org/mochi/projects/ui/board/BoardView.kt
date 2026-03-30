package org.mochi.projects.ui.board

import androidx.compose.foundation.background
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.remember
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
    onObjectClick: (String) -> Unit
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
        android.util.Log.d("BoardView", "objects=${objects.size} withParent=${objects.count { it.parent.isNotBlank() }} childrenByParent=${map.size} entries, total children=${map.values.sumOf { it.size }}")
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
                }
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
                    onMoveObject = { _, _ -> }
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
    onMoveObject: (String, Int) -> Unit
) {
    Column(
        modifier = Modifier
            .width(280.dp)
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
            if (option.colour.isNotBlank()) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(parseColor(option.colour))
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
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
        }

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
