package org.mochi.projects.ui.design

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import org.mochi.android.api.userMessage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DesignScreen(
    onBack: () -> Unit,
    viewModel: DesignViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Design") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            when {
                uiState.isLoading && uiState.projectDetails == null -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }

                uiState.error != null && uiState.projectDetails == null -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = uiState.error!!.userMessage(),
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }

                uiState.projectDetails != null -> {
                    val details = uiState.projectDetails!!

                    // Show class detail or field detail if selected
                    when {
                        uiState.selectedFieldId != null && uiState.selectedClassId != null -> {
                            val classId = uiState.selectedClassId!!
                            val fieldId = uiState.selectedFieldId!!
                            val field = details.fields[classId]?.find { it.id == fieldId }
                            val options = details.options[classId]?.get(fieldId) ?: emptyList()
                            if (field != null) {
                                FieldDetailScreen(
                                    classId = classId,
                                    field = field,
                                    options = options,
                                    viewModel = viewModel,
                                    onBack = { viewModel.selectField(null) }
                                )
                            }
                        }

                        uiState.selectedClassId != null -> {
                            val classId = uiState.selectedClassId!!
                            val cls = details.classes.find { it.id == classId }
                            val fields = details.fields[classId] ?: emptyList()
                            val hierarchy = details.hierarchy[classId] ?: emptyList()
                            if (cls != null) {
                                ClassDetailScreen(
                                    cls = cls,
                                    fields = fields,
                                    hierarchy = hierarchy,
                                    allClasses = details.classes,
                                    viewModel = viewModel,
                                    onBack = { viewModel.selectClass(null) },
                                    onFieldClick = { viewModel.selectField(it) }
                                )
                            }
                        }

                        else -> {
                            val tabs = listOf("Classes", "Views")
                            TabRow(selectedTabIndex = selectedTab) {
                                tabs.forEachIndexed { index, title ->
                                    Tab(
                                        selected = selectedTab == index,
                                        onClick = { selectedTab = index },
                                        text = { Text(title) }
                                    )
                                }
                            }

                            when (selectedTab) {
                                0 -> ClassesTab(
                                    classes = details.classes,
                                    viewModel = viewModel,
                                    onClassClick = { viewModel.selectClass(it) }
                                )
                                1 -> ViewsTab(
                                    views = details.views,
                                    classes = details.classes,
                                    fields = details.fields,
                                    viewModel = viewModel
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
