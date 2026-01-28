from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.user_login, name='user_login'),
    path('logout/', views.user_logout, name='user_logout'),
    path('', views.dashboard, name='dashboard'),
    path('my-tickets/', views.my_tickets, name='my_tickets'),
    path('report/', views.report_problem, name='report_problem'),
    path('tech-dashboard/', views.tech_dashboard, name='tech_dashboard'),
    path('track/<str:token>/', views.track_ticket, name='track_ticket'),
]
