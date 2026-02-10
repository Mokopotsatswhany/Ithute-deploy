# Ithute/admin.py
from django.contrib import admin
from .models import Ticket, UserProfile

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['token', 'reporter', 'branch', 'status', 'severity', 'created_at']
    list_filter = ['status', 'severity', 'branch', 'created_at']
    search_fields = ['token', 'description']
    readonly_fields = ['token', 'created_at']

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'branch', 'role']
    list_filter = ['role', 'branch']
