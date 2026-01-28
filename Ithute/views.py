from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages
from django.http import HttpResponseRedirect
from .models import Ticket, UserProfile
import string, random

def generate_token():
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=8))

def ai_classify(description):
    text = description.lower()
    high_keywords = ['printer broken', 'monitor broken', 'screen black', 'keyboard dead', 'mouse dead', 'pc wont boot']
    medium_keywords = ['slow', 'freeze', 'error', 'crash', 'login fail']
    
    if any(word in text for word in high_keywords):
        return 'Hardware Failure', 'high'
    elif any(word in text for word in medium_keywords):
        return 'Software Issue', 'medium'
    else:
        return 'General Support', 'low'

def user_login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user:
            auth_login(request, user)
            return redirect('dashboard')
        messages.error(request, 'Invalid credentials')
    return render(request, 'login.html')

def user_logout(request):
    auth_logout(request)
    return redirect('user_login')

@login_required
def dashboard(request):
    profile = request.user.userprofile
    return render(request, 'dashboard.html', {'profile': profile})

@login_required
def my_tickets(request):
    profile = request.user.userprofile
    tickets = Ticket.objects.filter(reporter=request.user)
    return render(request, 'track_progress.html', {'profile': profile, 'tickets': tickets})

@login_required
def report_problem(request):
    profile = request.user.userprofile
    if request.method == 'POST':
        description = request.POST['description']
        classification, severity = ai_classify(description)
        token = generate_token()
        Ticket.objects.create(
            token=token, reporter=request.user, branch=profile.branch,
            description=description, ai_classification=classification, severity=severity
        )
        messages.success(request, f'Ticket #{token} created! Priority: {severity.upper()}')
        return redirect('my_tickets')
    return render(request, 'report_problem.html', {'profile': profile})

@login_required
def tech_dashboard(request):
    profile = request.user.userprofile
    if profile.role != 'tech':
        return redirect('dashboard')
    tickets = Ticket.objects.filter(status='pending').order_by('-created_at')
    return render(request, 'tech_dashboard.html', {'profile': profile, 'tickets': tickets})

@login_required
def track_ticket(request, token):
    try:
        ticket = Ticket.objects.get(token=token)
        profile = request.user.userprofile
        return render(request, 'track_ticket.html', {'ticket': ticket, 'profile': profile})
    except Ticket.DoesNotExist:
        messages.error(request, 'Ticket not found')
        return redirect('my_tickets')
