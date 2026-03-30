package org.mochi.projects.ui.board

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
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
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    columnFieldId: String = "",
    rowFieldId: String? = null,
    depth: Int = 0,
    onClick: () -> Unit
) {
    var showMoveSheet by rememberSaveable(obj.id) { mutableStateOf(false) }
    var collapsed by rememberSaveable(obj.id) { mutableStateOf(true) }

    val children = childrenByParent[obj.id] ?: emptyList()
    val hasChildren = children.isNotEmpty()
    val isNested = depth > 0

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
    val cls = projectDetails?.classes?.find { it.id == obj.objectClass }
    val titleFieldId = cls?.title?.takeIf { it.isNotBlank() }
    val title = if (titleFieldId != null) {
        obj.stringValue(titleFieldId).ifBlank { "$prefix-${obj.number}" }
    } else {
        obj.readable.ifBlank { "$prefix-${obj.number}" }
    }
    val cardFields = viewModel.getCardFields(obj.objectClass)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (borderColor != null) Modifier.border(1.dp, borderColor, MaterialTheme.shapes.small)
                else Modifier
            )
            .combinedClickable(
                onClick = onClick,
                onLongClick = { showMoveSheet = true }
            ),
        shape = MaterialTheme.shapes.small,
        colors = CardDefaults.cardColors(
            containerColor = if (!isNested) MaterialTheme.colorScheme.surface
            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(if (!isNested) 12.dp else 8.dp)) {
                // Header row: [chevron] [title] [child count]
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (hasChildren) {
                        Icon(
                            imageVector = if (collapsed) Icons.Default.ChevronRight else Icons.Default.ExpandMore,
                            contentDescription = if (collapsed) "Expand" else "Collapse",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier
                                .size(16.dp)
                                .clickable { collapsed = !collapsed }
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                    }
                    Text(
                        text = title,
                        style = if (!isNested) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (hasChildren && collapsed) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${children.size}",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Body fields (top-level only, matching web's !isNested check)
                if (!isNested) {
                    val bodyFields = cardFields.filter {
                        it.id != columnFieldId && it.id != rowFieldId && it.id != titleFieldId
                    }
                    val fieldsWithValues = bodyFields.filter { obj.stringValue(it.id).isNotBlank() }
                    if (fieldsWithValues.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            fieldsWithValues.forEach { field ->
                                val value = obj.stringValue(field.id)
                                when (field.fieldtype) {
                                    "enumerated" -> {
                                        val options = viewModel.getAllOptionsForField(field.id)
                                        val opt = options.find { it.id == value }
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            if (opt != null && opt.colour.isNotBlank()) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(8.dp)
                                                        .background(
                                                            parseColor(opt.colour),
                                                            MaterialTheme.shapes.extraSmall
                                                        )
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                            }
                                            Text(
                                                text = opt?.name ?: value,
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                    else -> {
                                        Text(
                                            text = value.take(80),
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Nested children
                if (hasChildren && !collapsed) {
                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(8.dp))
                    if (depth < MAX_NESTING_DEPTH) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            children.sortedBy { it.rank }.forEach { child ->
                                BoardCard(
                                    obj = child,
                                    viewModel = viewModel,
                                    borderFieldId = borderFieldId,
                                    childrenByParent = childrenByParent,
                                    columnFieldId = columnFieldId,
                                    rowFieldId = rowFieldId,
                                    depth = depth + 1,
                                    onClick = onClick
                                )
                            }
                        }
                    } else {
                        val deepCount = countDeepChildren(obj.id, childrenByParent)
                        Text(
                            text = "+$deepCount nested",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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
