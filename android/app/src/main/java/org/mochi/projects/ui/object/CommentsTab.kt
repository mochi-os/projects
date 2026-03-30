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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Reply
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.mochi.android.model.Comment

@Composable
fun CommentsTab(
    comments: List<Comment>,
    onCreateComment: (String, String?) -> Unit,
    onUpdateComment: (String, String) -> Unit,
    onDeleteComment: (String) -> Unit
) {
    var newComment by remember { mutableStateOf("") }
    var replyToId by remember { mutableStateOf<String?>(null) }
    var replyToName by remember { mutableStateOf<String?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Comment input
        Column(modifier = Modifier.padding(16.dp)) {
            if (replyToName != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Replying to $replyToName",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            replyToId = null
                            replyToName = null
                        },
                        modifier = Modifier.size(16.dp)
                    ) {
                        Text("x", style = MaterialTheme.typography.labelSmall)
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = newComment,
                    onValueChange = { newComment = it },
                    placeholder = { Text("Add a comment") },
                    maxLines = 4,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (newComment.isNotBlank()) {
                            onCreateComment(newComment, replyToId)
                            newComment = ""
                            replyToId = null
                            replyToName = null
                        }
                    },
                    enabled = newComment.isNotBlank()
                ) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
                }
            }
        }

        HorizontalDivider()

        // Comment list
        if (comments.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No comments yet",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(comments, key = { it.id }) { comment ->
                    CommentItem(
                        comment = comment,
                        depth = 0,
                        onReply = { id, name ->
                            replyToId = id
                            replyToName = name
                        },
                        onEdit = onUpdateComment,
                        onDelete = onDeleteComment
                    )
                }
            }
        }
    }
}

@Composable
private fun CommentItem(
    comment: Comment,
    depth: Int,
    onReply: (String, String) -> Unit,
    onEdit: (String, String) -> Unit,
    onDelete: (String) -> Unit
) {
    var showOverflow by remember { mutableStateOf(false) }
    var isEditing by remember { mutableStateOf(false) }
    var editContent by remember { mutableStateOf(comment.text) }
    val indent = (depth * 16).dp

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = indent + 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = comment.name,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = comment.createdString,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Box {
                IconButton(
                    onClick = { showOverflow = true },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.MoreVert,
                        contentDescription = "More",
                        modifier = Modifier.size(16.dp)
                    )
                }
                DropdownMenu(
                    expanded = showOverflow,
                    onDismissRequest = { showOverflow = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Reply") },
                        onClick = {
                            showOverflow = false
                            onReply(comment.id, comment.name)
                        },
                        leadingIcon = { Icon(Icons.Default.Reply, contentDescription = null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        onClick = {
                            showOverflow = false
                            isEditing = true
                            editContent = comment.text
                        },
                        leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Delete") },
                        onClick = {
                            showOverflow = false
                            onDelete(comment.id)
                        },
                        leadingIcon = {
                            Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        }
                    )
                }
            }
        }

        if (isEditing) {
            OutlinedTextField(
                value = editContent,
                onValueChange = { editContent = it },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 6
            )
            Row {
                IconButton(onClick = {
                    onEdit(comment.id, editContent)
                    isEditing = false
                }) {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Save")
                }
                IconButton(onClick = { isEditing = false }) {
                    Text("Cancel", style = MaterialTheme.typography.labelSmall)
                }
            }
        } else {
            Text(
                text = comment.text,
                style = MaterialTheme.typography.bodyMedium
            )
        }

        // Render children
        if (comment.children.isNotEmpty()) {
            comment.children.forEach { child ->
                CommentItem(
                    comment = child,
                    depth = depth + 1,
                    onReply = onReply,
                    onEdit = onEdit,
                    onDelete = onDelete
                )
            }
        }
    }
}
