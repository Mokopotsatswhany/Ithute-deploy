from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone
from .models import Ticket, UserProfile
import string, random


def generate_token():
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=8))


def ai_classify(description):
    text = description.lower()
    if any(word in text for word in ['smoke', 'burn', 'fire', 'overheat', 'melt', 'spark']):
        return 'Hardware Failure', 'CRITICAL'
    elif any(word in text for word in ['printer', 'scan', 'broken', 'not working', 'server', 'board']):
        return 'Hardware Failure', 'HIGH'
    elif any(word in text for word in ['slow', 'freeze', 'lag', 'crash']):
        return 'Performance Issue', 'MEDIUM'
    elif any(word in text for word in ['password', 'login', 'access', 'forgot']):
        return 'Account Issue', 'LOW'
    else:
        return 'General Support', 'MEDIUM'


# AUTH VIEWS
def user_login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user:
            auth_login(request, user)
            profile = user.userprofile
            messages.success(request, f'Welcome back {profile.full_name}!')
            return redirect('dashboard')
        messages.error(request, 'Invalid username or password')
    return render(request, 'login.html')


def user_logout(request):
    auth_logout(request)
    messages.success(request, 'Logged out successfully')
    return redirect('user_login')


# STAFF DASHBOARD
@login_required
def dashboard(request):
    profile = request.user.userprofile
    if profile.role == 'tech':
        return redirect('tech_dashboard')
    return render(request, 'dashboard.html', {'profile': profile})


# USER TICKETS (ALL user's tickets)
@login_required
def my_tickets(request):
    profile = request.user.userprofile
    tickets = Ticket.objects.filter(reporter=request.user).order_by('-created_at')
    return render(request, 'my_tickets.html', {'profile': profile, 'tickets': tickets})


# REPORT PROBLEM
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
        messages.success(request, f'Ticket #{token} created!')
        return redirect('track_ticket')
    return render(request, 'report_problem.html', {'profile': profile})


# TRACK TICKETS (Reporters see OWN, Tech sees ALL)
@login_required
def track_ticket(request):
    ticket = None
    token_error = None
    
    # ADMIN/TECH sees ALL, reporters see OWN only
    if request.user.is_staff or (hasattr(request.user, 'userprofile') and request.user.userprofile.role == 'tech'):
        user_tickets = Ticket.objects.all().order_by('-created_at')
    else:
        user_tickets = Ticket.objects.filter(reporter=request.user).order_by('-created_at')
    
    if request.GET.get('token'):
        try:
            token = request.GET.get('token').upper()
            if request.user.is_staff or request.user.userprofile.role == 'tech':
                ticket = Ticket.objects.get(token=token)
            else:
                ticket = Ticket.objects.get(token=token, reporter=request.user)
        except Ticket.DoesNotExist:
            token_error = request.GET.get('token')
    
    return render(request, 'track.html', {
        'ticket': ticket, 'token_error': token_error, 'user_tickets': user_tickets
    })


# TECH DASHBOARD (KEEPS COUNTS - SECOND VERSION ONLY)
@login_required
def tech_dashboard(request):
    profile = request.user.userprofile
    
    if profile.role != 'tech':
        return redirect('dashboard')
    
    context = {
        'profile': profile,
        'pending_tickets': Ticket.objects.filter(status='pending').count(),
        'in_progress_tickets': Ticket.objects.filter(status='in_progress').count(),
        'tickets': Ticket.objects.filter(status='pending').order_by('-created_at')[:10]
    }
    return render(request, 'tech_dashboard.html', context)


# SINGLE TICKET DETAIL
@login_required
def ticket_detail(request, token):
    try:
        # ADMIN/TECH sees ALL, reporters see OWN only
        if request.user.is_staff or (hasattr(request.user, 'userprofile') and request.user.userprofile.role == 'tech'):
            ticket = Ticket.objects.get(token=token)
        else:
            ticket = Ticket.objects.get(token=token, reporter=request.user)
    except Ticket.DoesNotExist:
        ticket = None
    return render(request, 'ticket_detail.html', {'ticket': ticket})


# TECH ACTIONS
@login_required
def tech_update(request, token):
    if request.user.userprofile.role != 'tech':
        return redirect('dashboard')
    ticket = get_object_or_404(Ticket, token=token)
    if request.method == 'POST':
        ticket.status = request.POST['status']
        ticket.tech_notes = request.POST['notes']
        ticket.save()
        messages.success(request, f'Ticket #{token} updated!')
        return redirect('tech_dashboard')
    return render(request, 'tech_update.html', {'ticket': ticket})


@login_required
def assign_ticket(request, token):
    if request.user.userprofile.role != 'tech':
        return redirect('dashboard')
    ticket = get_object_or_404(Ticket, token=token)
    ticket.status = 'in_progress'
    ticket.assigned_to = request.user
    ticket.save()
    messages.success(request, f'Ticket #{token} assigned to you!')
    return redirect('tech_dashboard')


@login_required
def resolve_ticket(request, token):
    if request.user.userprofile.role != 'tech':
        return redirect('dashboard')
    ticket = get_object_or_404(Ticket, token=token)
    ticket.status = 'solved'
    ticket.solved_by = request.user
    ticket.solved_at = timezone.now()
    ticket.save()
    messages.success(request, f'Ticket #{token} resolved!')
    return redirect('tech_dashboard')


@login_required
def reopen_ticket(request, token):
    """Allow reporter to reopen their own solved ticket"""
    ticket = get_object_or_404(Ticket, token=token, reporter=request.user)
    if ticket.status == 'solved':
        ticket.status = 'pending'
        ticket.solved_by = None
        ticket.solved_at = None
        ticket.save()
        messages.success(request, f'Ticket #{token} reopened!')
    return redirect('track_ticket')
