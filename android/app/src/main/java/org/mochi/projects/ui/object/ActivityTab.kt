package org.mochi.projects.ui.`object`

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.mochi.android.util.formatTimestamp
import org.mochi.projects.model.Activity
import org.mochi.projects.model.ProjectDetails

@Composable
fun ActivityTab(
    activity: List<Activity>,
    projectDetails: ProjectDetails
) {
    if (activity.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No activity",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize()
    ) {
        items(activity, key = { it.id }) { item ->
            ActivityItem(item = item, projectDetails = projectDetails)
            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
        }
    }
}

@Composable
private fun ActivityItem(
    item: Activity,
    projectDetails: ProjectDetails
) {
    val icon = when (item.action) {
        "created" -> Icons.Default.Add
        "deleted" -> Icons.Default.Delete
        else -> Icons.Default.Edit
    }

    val fieldName = if (item.field.isNotBlank()) {
        // Try to find field name from project details
        var name = item.field
        for ((_, fields) in projectDetails.fields) {
            val found = fields.find { it.id == item.field }
            if (found != null) {
                name = found.name
                break
            }
        }
        name
    } else ""

    val description = when (item.action) {
        "created" -> "created this object"
        "deleted" -> "deleted this object"
        else -> {
            if (fieldName.isNotBlank()) {
                if (item.oldvalue.isNotBlank() && item.newvalue.isNotBlank()) {
                    "changed $fieldName from \"${item.oldvalue}\" to \"${item.newvalue}\""
                } else if (item.newvalue.isNotBlank()) {
                    "set $fieldName to \"${item.newvalue}\""
                } else if (item.oldvalue.isNotBlank()) {
                    "cleared $fieldName"
                } else {
                    "updated $fieldName"
                }
            } else {
                "made a change"
            }
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = item.created.formatTimestamp(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

