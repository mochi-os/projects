package org.mochi.projects.ui.tree

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.mochi.projects.model.ProjectObject
import org.mochi.projects.model.ProjectView
import org.mochi.projects.ui.project.ProjectViewModel

data class TreeNode(
    val obj: ProjectObject,
    val depth: Int,
    val hasChildren: Boolean,
    val isExpanded: Boolean
)

@Composable
fun TreeView(
    objects: List<ProjectObject>,
    view: ProjectView?,
    viewModel: ProjectViewModel,
    onObjectClick: (String) -> Unit
) {
    val expandedState = remember { mutableStateMapOf<String, Boolean>() }

    if (objects.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                text = "No objects",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }

    // Build tree structure from flat list
    val childMap = objects.groupBy { it.parent }
    val roots = objects.filter { it.parent.isBlank() || objects.none { other -> other.id == it.parent } }

    fun flattenTree(items: List<ProjectObject>, depth: Int): List<TreeNode> {
        val result = mutableListOf<TreeNode>()
        for (item in items) {
            val children = childMap[item.id] ?: emptyList()
            val isExpanded = expandedState[item.id] ?: (depth == 0)
            result.add(
                TreeNode(
                    obj = item,
                    depth = depth,
                    hasChildren = children.isNotEmpty(),
                    isExpanded = isExpanded
                )
            )
            if (isExpanded && children.isNotEmpty()) {
                result.addAll(flattenTree(children, depth + 1))
            }
        }
        return result
    }

    val flatNodes = flattenTree(roots, 0)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        items(flatNodes, key = { it.obj.id }) { node ->
            TreeRow(
                node = node,
                viewModel = viewModel,
                onToggleExpand = {
                    expandedState[node.obj.id] = !(expandedState[node.obj.id] ?: (node.depth == 0))
                },
                onClick = { onObjectClick(node.obj.id) },
                onDelete = { viewModel.deleteObject(node.obj.id) }
            )
        }
    }
}
