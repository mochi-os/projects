package org.mochi.projects.ui.tree

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.mochi.projects.ui.project.ProjectViewModel

@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
fun TreeRow(
    node: TreeNode,
    viewModel: ProjectViewModel,
    onToggleExpand: () -> Unit,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    var showContextMenu by remember { mutableStateOf(false) }
    val indent = (node.depth * 24).dp
    val obj = node.obj
    val projectDetails = viewModel.uiState.value.projectDetails
    val prefix = projectDetails?.project?.prefix ?: ""
    val cardFields = viewModel.getCardFields(obj.objectClass)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = { showContextMenu = true }
            )
            .padding(start = indent + 4.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Expand/collapse
        if (node.hasChildren) {
            IconButton(
                onClick = onToggleExpand,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = if (node.isExpanded) Icons.Default.ExpandMore else Icons.Default.ChevronRight,
                    contentDescription = if (node.isExpanded) "Collapse" else "Expand",
                    modifier = Modifier.size(20.dp)
                )
            }
        } else {
            Spacer(modifier = Modifier.width(28.dp))
        }

        Spacer(modifier = Modifier.width(4.dp))

        // Object number
        Text(
            text = if (prefix.isNotBlank()) "$prefix-${obj.number}" else "#${obj.number}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.width(8.dp))

        // Title and field chips
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = obj.readable,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (cardFields.isNotEmpty()) {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    cardFields.forEach { field ->
                        val value = obj.stringValue(field.id)
                        if (value.isNotBlank()) {
                            val displayValue = when (field.fieldtype) {
                                "enumerated" -> {
                                    val options = viewModel.getAllOptionsForField(field.id)
                                    options.find { it.id == value }?.name ?: value
                                }
                                else -> value
                            }
                            if (displayValue.isNotBlank()) {
                                SuggestionChip(
                                    onClick = { },
                                    label = {
                                        Text(
                                            text = displayValue,
                                            style = MaterialTheme.typography.labelSmall,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Context menu
        if (showContextMenu) {
            DropdownMenu(
                expanded = showContextMenu,
                onDismissRequest = { showContextMenu = false }
            ) {
                DropdownMenuItem(
                    text = { Text("Delete") },
                    onClick = {
                        showContextMenu = false
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
