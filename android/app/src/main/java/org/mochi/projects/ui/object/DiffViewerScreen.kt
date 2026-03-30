package org.mochi.projects.ui.`object`

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.mochi.android.api.MochiError
import org.mochi.android.api.toMochiError
import org.mochi.android.api.userMessage
import org.mochi.projects.repository.ProjectsRepository
import javax.inject.Inject

data class DiffViewerUiState(
    val diffHtml: String = "",
    val isLoading: Boolean = false,
    val error: MochiError? = null,
    val isUnified: Boolean = true
)

@HiltViewModel
class DiffViewerViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: ProjectsRepository
) : ViewModel() {

    val projectId: String = savedStateHandle.get<String>("projectId") ?: ""
    val repo: String = savedStateHandle.get<String>("repo") ?: ""
    val source: String = savedStateHandle.get<String>("source") ?: ""
    val target: String = savedStateHandle.get<String>("target") ?: ""

    private val _uiState = MutableStateFlow(DiffViewerUiState())
    val uiState: StateFlow<DiffViewerUiState> = _uiState.asStateFlow()

    init {
        loadDiff()
    }

    fun loadDiff() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val diff = repository.getDiff(repo, source, target)
                _uiState.value = _uiState.value.copy(
                    diffHtml = wrapDiffHtml(diff),
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.toMochiError()
                )
            }
        }
    }

    fun toggleViewMode() {
        _uiState.value = _uiState.value.copy(isUnified = !_uiState.value.isUnified)
    }

    private fun wrapDiffHtml(diff: String): String {
        val escaped = diff
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")

        val lines = escaped.split("\n")
        val htmlLines = lines.joinToString("\n") { line ->
            when {
                line.startsWith("+") -> "<div class=\"add\">$line</div>"
                line.startsWith("-") -> "<div class=\"del\">$line</div>"
                line.startsWith("@@") -> "<div class=\"hunk\">$line</div>"
                else -> "<div class=\"ctx\">$line</div>"
            }
        }

        return """
            <!DOCTYPE html>
            <html>
            <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: monospace; font-size: 12px; margin: 0; padding: 8px; background: #fff; }
                .add { background: #e6ffed; color: #22863a; }
                .del { background: #ffeef0; color: #cb2431; }
                .hunk { background: #f1f8ff; color: #032f62; font-weight: bold; margin-top: 8px; }
                .ctx { color: #24292e; }
                div { padding: 1px 4px; white-space: pre-wrap; word-break: break-all; }
                @media (prefers-color-scheme: dark) {
                    body { background: #1a1c1e; }
                    .add { background: #1b3a28; color: #7ee787; }
                    .del { background: #3c1b20; color: #f85149; }
                    .hunk { background: #1c2d41; color: #79c0ff; }
                    .ctx { color: #e3e2e6; }
                }
            </style>
            </head>
            <body>$htmlLines</body>
            </html>
        """.trimIndent()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiffViewerScreen(
    onBack: () -> Unit,
    viewModel: DiffViewerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Diff: ${viewModel.source} -> ${viewModel.target}") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    FilterChip(
                        selected = uiState.isUnified,
                        onClick = { viewModel.toggleViewMode() },
                        label = { Text(if (uiState.isUnified) "Unified" else "Split") },
                        leadingIcon = { Icon(Icons.Default.SwapHoriz, contentDescription = null, modifier = androidx.compose.ui.Modifier.height(16.dp)) }
                    )
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                uiState.error != null -> {
                    Text(
                        text = uiState.error!!.userMessage(),
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }

                uiState.diffHtml.isNotBlank() -> {
                    AndroidView(
                        factory = { context ->
                            WebView(context).apply {
                                webViewClient = WebViewClient()
                                settings.javaScriptEnabled = false
                                settings.loadWithOverviewMode = true
                                settings.useWideViewPort = true
                            }
                        },
                        update = { webView ->
                            webView.loadDataWithBaseURL(
                                null,
                                uiState.diffHtml,
                                "text/html",
                                "UTF-8",
                                null
                            )
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }

                else -> {
                    Text(
                        text = "No diff available",
                        modifier = Modifier.align(Alignment.Center),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
