package org.mochi.projects.ui.design

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.mochi.projects.model.ProjectClass
import org.mochi.projects.model.ProjectField
import org.mochi.projects.ui.`object`.ConfirmDeleteDialog

private val FIELD_TYPES = listOf(
    "text" to "Text",
    "number" to "Number",
    "enumerated" to "Enumerated",
    "user" to "User",
    "date" to "Date",
    "checklist" to "Checklist"
)

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ClassDetailScreen(
    cls: ProjectClass,
    fields: List<ProjectField>,
    hierarchy: List<String>,
    allClasses: List<ProjectClass>,
    viewModel: DesignViewModel,
    onBack: () -> Unit,
    onFieldClick: (String) -> Unit
) {
    var editName by remember { mutableStateOf(cls.name) }
    var showAddFieldDialog by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Back button
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text(
                text = "Class: ${cls.name}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Name
        OutlinedTextField(
            value = editName,
            onValueChange = { editName = it },
            label = { Text("Name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        if (editName != cls.name && editName.isNotBlank()) {
            TextButton(onClick = {
                viewModel.updateClass(cls.id, editName)
            }) {
                Text("Save name")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))

        // Hierarchy
        Text("Parent classes", style = MaterialTheme.typography.titleSmall)
        Spacer(modifier = Modifier.height(8.dp))
        val otherClasses = allClasses.filter { it.id != cls.id }
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            otherClasses.forEach { otherCls ->
                FilterChip(
                    selected = otherCls.id in hierarchy,
                    onClick = {
                        val newHierarchy = if (otherCls.id in hierarchy) {
                            hierarchy - otherCls.id
                        } else {
                            hierarchy + otherCls.id
                        }
                        viewModel.setHierarchy(cls.id, newHierarchy)
                    },
                    label = { Text(otherCls.name) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))

        // Fields
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Fields", style = MaterialTheme.typography.titleSmall)
            IconButton(onClick = { showAddFieldDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add field")
            }
        }

        fields.sortedBy { it.rank }.forEach { field ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onFieldClick(field.id) }
                    .padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = field.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = FIELD_TYPES.find { it.first == field.fieldtype }?.second ?: field.fieldtype,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            HorizontalDivider()
        }

        Spacer(modifier = Modifier.height(32.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))

        // Delete class
        OutlinedButton(
            onClick = { showDeleteConfirm = true },
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Delete, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Delete class")
        }
    }

    if (showAddFieldDialog) {
        AddFieldDialog(
            onDismiss = { showAddFieldDialog = false },
            onAdd = { name, fieldtype, flags, multi ->
                viewModel.createField(cls.id, name, fieldtype, flags, multi)
                showAddFieldDialog = false
            }
        )
    }

    if (showDeleteConfirm) {
        ConfirmDeleteDialog(
            title = "Delete class",
            message = "Are you sure you want to delete the class \"${cls.name}\"? All fields and their options will also be deleted.",
            onConfirm = {
                showDeleteConfirm = false
                viewModel.deleteClass(cls.id)
                onBack()
            },
            onDismiss = { showDeleteConfirm = false }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddFieldDialog(
    onDismiss: () -> Unit,
    onAdd: (String, String, String?, Boolean?) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var fieldtype by remember { mutableStateOf("text") }
    var typeExpanded by remember { mutableStateOf(false) }
    var isRequired by remember { mutableStateOf(false) }
    var isReadonly by remember { mutableStateOf(false) }
    var isSortable by remember { mutableStateOf(false) }
    var isFilterable by remember { mutableStateOf(false) }
    var isMulti by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add field") },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
                ExposedDropdownMenuBox(
                    expanded = typeExpanded,
                    onExpandedChange = { typeExpanded = it }
                ) {
                    OutlinedTextField(
                        value = FIELD_TYPES.find { it.first == fieldtype }?.second ?: fieldtype,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Type") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = typeExpanded) },
                        modifier = Modifier
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            .fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = typeExpanded,
                        onDismissRequest = { typeExpanded = false }
                    ) {
                        FIELD_TYPES.forEach { (value, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    fieldtype = value
                                    typeExpanded = false
                                }
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isRequired, onCheckedChange = { isRequired = it })
                    Text("Required")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isReadonly, onCheckedChange = { isReadonly = it })
                    Text("Read-only")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isSortable, onCheckedChange = { isSortable = it })
                    Text("Sortable")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isFilterable, onCheckedChange = { isFilterable = it })
                    Text("Filterable")
                }
                if (fieldtype == "enumerated") {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = isMulti, onCheckedChange = { isMulti = it })
                        Text("Multi-select")
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val flags = buildList {
                        if (isRequired) add("required")
                        if (isReadonly) add("readonly")
                        if (isSortable) add("sort")
                        if (isFilterable) add("filter")
                    }.joinToString(",").ifEmpty { null }
                    onAdd(name, fieldtype, flags, if (fieldtype == "enumerated" && isMulti) true else null)
                },
                enabled = name.isNotBlank()
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
