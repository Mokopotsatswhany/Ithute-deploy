from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [

    # AUTH
    path('', views.user_login, name='user_login'),
    path('login/', views.user_login, name='user_login'),  
    path('logout/', views.user_logout, name='user_logout'),
    
    # STAFF/REPORTER PAGES
    path('dashboard/', views.dashboard, name='dashboard'),
    path('my-tickets/', views.my_tickets, name='my_tickets'),
    path('report/', views.report_problem, name='report_problem'),
    
    # TRACK SYSTEM (NEW)
    path('track/', views.track_ticket, name='track_ticket'),           
    path('ticket/<str:token>/', views.ticket_detail, name='ticket_detail'),  # Single ticket
    
    # TECH PAGES
    path('tech-dashboard/', views.tech_dashboard, name='tech_dashboard'),
    path('tech-update/<str:token>/', views.tech_update, name='tech_update'),
    
    # TECH ACTIONS
    path('assign/<str:token>/', views.assign_ticket, name='assign_ticket'),
    path('resolve/<str:token>/', views.resolve_ticket, name='resolve_ticket'),
    path('reopen/<str:token>/', views.reopen_ticket, name='reopen_ticket'),
    path('tech/update/<str:token>/', views.tech_update, name='tech_update'),
    path('tech/dashboard/', views.tech_dashboard, name='tech_dashboard'),

]
