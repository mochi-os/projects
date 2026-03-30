package org.mochi.projects.ui.board

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import org.mochi.projects.model.ProjectObject
import org.mochi.projects.ui.project.ProjectViewModel

private const val MAX_NESTING_DEPTH = 3

@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
fun BoardCard(
    obj: ProjectObject,
    viewModel: ProjectViewModel,
    borderFieldId: String?,
    childrenByParent: Map<String, List<ProjectObject>>,
    depth: Int = 0,
    onClick: () -> Unit
) {
    var showMoveSheet by remember { mutableStateOf(false) }
    var collapsed by rememberSaveable(obj.id) { mutableStateOf(true) }

    val children = childrenByParent[obj.id] ?: emptyList()
    val hasChildren = children.isNotEmpty()

    val borderColor = if (borderFieldId != null) {
        val borderValue = obj.stringValue(borderFieldId)
        if (borderValue.isNotBlank()) {
            val options = viewModel.getAllOptionsForField(borderFieldId)
            val option = options.find { it.id == borderValue }
            if (option != null && option.colour.isNotBlank()) {
                parseColor(option.colour)
            } else null
        } else null
    } else null

    val projectDetails = viewModel.uiState.value.projectDetails
    val prefix = projectDetails?.project?.prefix ?: ""
    val cardFields = viewModel.getCardFields(obj.objectClass)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = { showMoveSheet = true }
            ),
        shape = MaterialTheme.shapes.small,
        colors = CardDefaults.cardColors(
            containerColor = if (depth == 0) MaterialTheme.colorScheme.surface
            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(modifier = Modifier.height(IntrinsicSize.Min)) {
            // Colored left border
            if (borderColor != null) {
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .fillMaxHeight()
                        .background(borderColor)
                )
            }

            Column(modifier = Modifier.padding(if (depth == 0) 12.dp else 8.dp)) {
                // Header row: number + expand toggle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (prefix.isNotBlank()) "$prefix-${obj.number}" else "#${obj.number}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    if (hasChildren) {
                        if (collapsed) {
                            Text(
                                text = "${children.size}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                        }
                        Icon(
                            imageVector = if (collapsed) Icons.Default.ExpandMore else Icons.Default.ExpandLess,
                            contentDescription = if (collapsed) "Expand" else "Collapse",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier
                                .size(20.dp)
                                .clickable { collapsed = !collapsed }
                        )
                    }
                }

                // Title
                Text(
                    text = obj.readable,
                    style = if (depth == 0) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                // Card fields as chips
                if (cardFields.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(6.dp))
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
                                        val opt = options.find { it.id == value }
                                        opt?.name ?: value
                                    }
                                    else -> value
                                }
                                if (displayValue.isNotBlank()) {
                                    val chipColor = if (field.fieldtype == "enumerated") {
                                        val options = viewModel.getAllOptionsForField(field.id)
                                        val opt = options.find { it.id == value }
                                        if (opt != null && opt.colour.isNotBlank()) {
                                            parseColor(opt.colour).copy(alpha = 0.15f)
                                        } else null
                                    } else null

                                    SuggestionChip(
                                        onClick = { },
                                        label = {
                                            Text(
                                                text = displayValue,
                                                style = MaterialTheme.typography.labelSmall,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        },
                                        colors = if (chipColor != null) {
                                            SuggestionChipDefaults.suggestionChipColors(
                                                containerColor = chipColor
                                            )
                                        } else {
                                            SuggestionChipDefaults.suggestionChipColors()
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                // Nested children
                if (hasChildren && !collapsed) {
                    Spacer(modifier = Modifier.height(6.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(6.dp))
                    if (depth < MAX_NESTING_DEPTH) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            children.sortedBy { it.rank }.forEach { child ->
                                BoardCard(
                                    obj = child,
                                    viewModel = viewModel,
                                    borderFieldId = borderFieldId,
                                    childrenByParent = childrenByParent,
                                    depth = depth + 1,
                                    onClick = { onClick() }
                                )
                            }
                        }
                    } else {
                        val deepCount = countDeepChildren(obj.id, childrenByParent)
                        Text(
                            text = "+$deepCount nested",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }

    if (showMoveSheet) {
        MoveObjectSheet(
            obj = obj,
            viewModel = viewModel,
            onDismiss = { showMoveSheet = false }
        )
    }
}

private fun countDeepChildren(parentId: String, childrenByParent: Map<String, List<ProjectObject>>): Int {
    val direct = childrenByParent[parentId] ?: return 0
    return direct.size + direct.sumOf { countDeepChildren(it.id, childrenByParent) }
}
