package org.mochi.projects.ui.board

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import org.mochi.projects.model.ProjectObject
import org.mochi.projects.ui.project.ProjectViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoveObjectSheet(
    obj: ProjectObject,
    viewModel: ProjectViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()
    val activeView = viewModel.getActiveView() ?: run { onDismiss(); return }
    val columnFieldId = activeView.columns.takeIf { it.isNotBlank() } ?: run { onDismiss(); return }
    val columnOptions = viewModel.getAllOptionsForField(columnFieldId)
    val currentValue = obj.stringValue(columnFieldId)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
            Text(
                text = "Move to column",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            HorizontalDivider()
            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn {
                items(columnOptions, key = { it.id }) { option ->
                    val isSelected = option.id == currentValue
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                if (!isSelected) {
                                    viewModel.moveObject(obj.id, columnFieldId, option.id, 0)
                                }
                                onDismiss()
                            }
                            .padding(vertical = 12.dp, horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (option.colour.isNotBlank()) {
                            Surface(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape),
                                color = parseColor(option.colour)
                            ) { }
                            Spacer(modifier = Modifier.width(12.dp))
                        }
                        Text(
                            text = option.name,
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.weight(1f)
                        )
                        if (isSelected) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = "Current",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
