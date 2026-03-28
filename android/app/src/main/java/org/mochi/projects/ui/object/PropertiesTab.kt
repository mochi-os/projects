package org.mochi.projects.ui.`object`

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.mochi.projects.model.ChecklistItem
import org.mochi.projects.model.FieldOption
import org.mochi.projects.model.ProjectDetails
import org.mochi.projects.model.ProjectField
import org.mochi.projects.model.ProjectObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun PropertiesTab(
    obj: ProjectObject,
    projectDetails: ProjectDetails,
    viewModel: ObjectDetailViewModel
) {
    val fields = projectDetails.fields[obj.objectClass] ?: emptyList()
    val classOptions = projectDetails.options[obj.objectClass] ?: emptyMap()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Title field (always first)
        OutlinedTextField(
            value = obj.readable,
            onValueChange = { viewModel.updateTitle(it) },
            label = { Text("Title") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))

        // Dynamic fields
        fields.sortedBy { it.rank }.forEach { field ->
            FieldEditor(
                field = field,
                value = obj.values[field.id],
                options = classOptions[field.id] ?: emptyList(),
                onValueChange = { viewModel.setValue(field.id, it) },
                onMultiValueChange = { viewModel.setMultiValue(field.id, it) }
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun FieldEditor(
    field: ProjectField,
    value: Any?,
    options: List<FieldOption>,
    onValueChange: (String) -> Unit,
    onMultiValueChange: (List<String>) -> Unit
) {
    val stringValue = value?.toString() ?: ""
    val listValue = (value as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList()

    Column(modifier = Modifier.fillMaxWidth()) {
        when (field.fieldtype) {
            "text" -> {
                OutlinedTextField(
                    value = stringValue,
                    onValueChange = onValueChange,
                    label = { Text(field.name) },
                    readOnly = field.isReadonly,
                    singleLine = field.rows <= 1,
                    maxLines = if (field.rows > 1) field.rows else 1,
                    minLines = if (field.rows > 1) field.rows.coerceAtMost(3) else 1,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            "number" -> {
                OutlinedTextField(
                    value = stringValue,
                    onValueChange = { newVal ->
                        if (newVal.isEmpty() || newVal.toDoubleOrNull() != null) {
                            onValueChange(newVal)
                        }
                    },
                    label = { Text(field.name) },
                    readOnly = field.isReadonly,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            "enumerated" -> {
                if (field.isMulti) {
                    // Multi-select chips
                    Text(
                        text = field.name,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        options.sortedBy { it.rank }.forEach { option ->
                            val isSelected = option.id in listValue || option.id == stringValue
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    if (field.isReadonly) return@FilterChip
                                    val current = listValue.toMutableList()
                                    if (isSelected) {
                                        current.remove(option.id)
                                    } else {
                                        current.add(option.id)
                                    }
                                    onMultiValueChange(current)
                                },
                                label = { Text(option.name) },
                                enabled = !field.isReadonly
                            )
                        }
                    }
                } else {
                    // Single select dropdown
                    var expanded by remember { mutableStateOf(false) }
                    val selectedOption = options.find { it.id == stringValue }

                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { if (!field.isReadonly) expanded = it }
                    ) {
                        OutlinedTextField(
                            value = selectedOption?.name ?: "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text(field.name) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                            modifier = Modifier
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                                .fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("None", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                                onClick = {
                                    onValueChange("")
                                    expanded = false
                                }
                            )
                            options.sortedBy { it.rank }.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option.name) },
                                    onClick = {
                                        onValueChange(option.id)
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }

            "user" -> {
                // Simple text field for user - in a full implementation this would use PersonPicker
                OutlinedTextField(
                    value = stringValue,
                    onValueChange = onValueChange,
                    label = { Text(field.name) },
                    readOnly = field.isReadonly,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            "date" -> {
                var showDatePicker by remember { mutableStateOf(false) }
                val displayDate = if (stringValue.isNotBlank()) {
                    try {
                        val millis = stringValue.toLongOrNull()
                        if (millis != null) {
                            SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(millis * 1000))
                        } else {
                            stringValue
                        }
                    } catch (_: Exception) {
                        stringValue
                    }
                } else ""

                OutlinedTextField(
                    value = displayDate,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(field.name) },
                    trailingIcon = {
                        IconButton(onClick = { if (!field.isReadonly) showDatePicker = true }) {
                            Icon(Icons.Default.CalendarToday, contentDescription = "Pick date")
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { if (!field.isReadonly) showDatePicker = true }
                )

                if (showDatePicker) {
                    val datePickerState = rememberDatePickerState(
                        initialSelectedDateMillis = stringValue.toLongOrNull()?.times(1000)
                    )
                    DatePickerDialog(
                        onDismissRequest = { showDatePicker = false },
                        confirmButton = {
                            TextButton(onClick = {
                                val selectedMillis = datePickerState.selectedDateMillis
                                if (selectedMillis != null) {
                                    onValueChange((selectedMillis / 1000).toString())
                                }
                                showDatePicker = false
                            }) {
                                Text("OK")
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { showDatePicker = false }) {
                                Text("Cancel")
                            }
                        }
                    ) {
                        DatePicker(state = datePickerState)
                    }
                }
            }

            "checklist" -> {
                ChecklistEditor(
                    fieldName = field.name,
                    value = stringValue,
                    isReadonly = field.isReadonly,
                    onValueChange = onValueChange
                )
            }

            else -> {
                // Fallback: text field
                OutlinedTextField(
                    value = stringValue,
                    onValueChange = onValueChange,
                    label = { Text(field.name) },
                    readOnly = field.isReadonly,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        if (field.isRequired && stringValue.isBlank() && (value as? List<*>).isNullOrEmpty()) {
            Text(
                text = "${field.name} is required",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}

@Composable
private fun ChecklistEditor(
    fieldName: String,
    value: String,
    isReadonly: Boolean,
    onValueChange: (String) -> Unit
) {
    val gson = remember { Gson() }
    val items = remember(value) {
        try {
            if (value.isBlank()) emptyList()
            else {
                val type = object : TypeToken<List<ChecklistItem>>() {}.type
                gson.fromJson<List<ChecklistItem>>(value, type)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun updateItems(newItems: List<ChecklistItem>) {
        onValueChange(gson.toJson(newItems))
    }

    Column {
        Text(
            text = fieldName,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(4.dp))

        items.forEachIndexed { index, item ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = item.checked,
                    onCheckedChange = { checked ->
                        if (isReadonly) return@Checkbox
                        val updated = items.toMutableList()
                        updated[index] = item.copy(checked = checked)
                        updateItems(updated)
                    },
                    enabled = !isReadonly
                )
                OutlinedTextField(
                    value = item.text,
                    onValueChange = { text ->
                        if (isReadonly) return@OutlinedTextField
                        val updated = items.toMutableList()
                        updated[index] = item.copy(text = text)
                        updateItems(updated)
                    },
                    readOnly = isReadonly,
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                if (!isReadonly) {
                    IconButton(
                        onClick = {
                            val updated = items.toMutableList()
                            updated.removeAt(index)
                            updateItems(updated)
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Remove", modifier = Modifier.size(16.dp))
                    }
                }
            }
        }

        if (!isReadonly) {
            TextButton(
                onClick = {
                    updateItems(items + ChecklistItem(text = "", checked = false))
                }
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Add item")
            }
        }
    }
}
