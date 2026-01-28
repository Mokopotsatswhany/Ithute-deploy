from django.contrib import admin
from .models import UserProfile, Ticket

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'branch', 'role']
    list_filter = ['role', 'branch']
    search_fields = ['full_name']

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['token', 'reporter', 'ai_classification', 'severity', 'status', 'updated_at']
    list_filter = ['status', 'severity']
    search_fields = ['token', 'description']
