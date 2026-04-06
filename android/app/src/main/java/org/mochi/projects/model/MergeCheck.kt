package org.mochi.projects.model

data class MergeCheck(
    val mergeable: Boolean = false,
    val conflicts: List<String> = emptyList(),
    val ahead: Int = 0,
    val behind: Int = 0
)
