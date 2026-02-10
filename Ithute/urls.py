from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    # AUTH (TOP PRIORITY)
    path('', views.user_login, name='user_login'),
    path('login/', views.user_login, name='user_login'),
    path('logout/', views.user_logout, name='user_logout'),
    
    # STAFF/REPORTER PAGES
    
    path('report/', views.report_problem, name='report_problem'),  # ← report_problem view
    path('track/<str:token>/', views.ticket_detail, name='ticket_detail'),

    # TRACK SYSTEM (SINGLE URL)
    path('track/', views.track_ticket, name='track'),  # ← track_ticket view
    
    # SINGLE TICKET DETAIL
    path('ticket/<str:token>/', views.ticket_detail, name='ticket_detail'),
    
    # TECH PAGES (CONSOLIDATED)
    path('tech-dashboard/', views.tech_dashboard, name='tech_dashboard'),
    path('tech-update/<str:token>/', views.tech_update, name='tech_update'),
    
    # TECH ACTIONS
    path('assign/<str:token>/', views.assign_ticket, name='assign_ticket'),
    path('resolve/<str:token>/', views.resolve_ticket, name='resolve_ticket'),
    path('reopen/<str:token>/', views.reopen_ticket, name='reopen_ticket'),
    path('admin/', admin.site.urls),
]
