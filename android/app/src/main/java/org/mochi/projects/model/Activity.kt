package org.mochi.projects.model

data class Activity(
    val id: String = "",
    val user: Int = 0,
    val name: String = "",
    val action: String = "",
    val field: String = "",
    val oldvalue: String = "",
    val newvalue: String = "",
    val created: Long = 0
)
