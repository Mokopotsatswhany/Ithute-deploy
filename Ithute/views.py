from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone
from .models import Ticket, UserProfile
import string, random
import os
import pickle
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression


# TECH ACTIONS
@login_required
def tech_update(request, token):
    profile = get_profile(request.user)
    if profile.role != 'tech':
        return redirect('dashboard')
    ticket = get_object_or_404(Ticket, token=token)
    if request.method == 'POST':
        ticket.status = request.POST['status']
        ticket.tech_notes = request.POST.get('notes', '')
        ticket.save()
        messages.success(request, f'Ticket #{token} updated!')#sends message and create ticket
        return redirect('tech_dashboard')
    return render(request, 'tech_update.html', {'ticket': ticket})


# AUTH VIEWS
def user_login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user:
            auth_login(request, user)
            profile = get_profile(user)
            messages.success(request, f'Welcome we are here to help you {profile.full_name}!')
            return redirect('report_problem') 
        messages.error(request, 'Invalid username or password')
    return render(request, 'login.html')


# Reporting a problem 
def report_problem(request):
    if not request.user.is_authenticated:  # ← ADD login check
        return redirect('user_login')
        
    profile = get_profile(request.user)
    
    # SEARCH - Show ticket details
    ticket = None
    search_token = request.GET.get('token', '').strip()
    if search_token:
        clean_token = search_token.replace('#', '').strip()
        ticket = Ticket.objects.filter(token__iexact=clean_token).first()
        if ticket and ticket.reporter != request.user and not request.user.is_staff:
            ticket = None
        if not ticket:
            messages.warning(request, f'Ticket #{search_token} not found')
    
    # CREATE - New ticket  
    if request.method == 'POST':
        description = request.POST.get('description', '').strip()
        if description:
            classification, severity = ai_classify(description)
            token = generate_token()
            ticket = Ticket.objects.create(
                token=token,
                reporter=request.user,
                branch=profile.branch,
                description=description,
                ai_classification=classification,
                severity=severity,
                status='pending'
            )
            messages.success(request, f'Ticket #{token} created!')
            return redirect('report_problem')
    
    context = {
        'profile': profile,
        'ticket': ticket,
        'search_token': search_token
    }
    return render(request, 'report_problem.html', context)


def user_logout(request):
    auth_logout(request)
    messages.success(request, 'Logged out successfully')
    return redirect('user_login')


def get_profile(user):
    profile, created = UserProfile.objects.get_or_create(user=user)
    if created:
        profile.branch = 'Maputsoe'  
        profile.role = 'staff'
        profile.full_name = user.get_full_name() or user.username.title()
        profile.save()
    return profile

# Generate individual tokens
def generate_token():
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=8))

class Classifier:
    def __init__(self):
        self.model_path = 'classifier.pkl'
        if os.path.exists(self.model_path): #To see or check if model file exists
            with open(self.model_path, 'rb') as f:
                self.vectorizer, self.model = pickle.load(f)
        else:
            self._train_model()
    
    def _train_model(self):
        texts = [
            'hot pc overheating', 'smoke from computer', 'printer not working', 
            'network down', 'wifi not connecting'
        ]
        labels = ['Hardware', 'Hardware', 'Hardware', 'Software', 'Network', 'Network']
        
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        
        self.model = LogisticRegression(max_iter=200)
        
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)
        
        with open(self.model_path, 'wb') as f:
            pickle.dump((self.vectorizer, self.model), f)
    
    def classify(self, description):
        try:
            X = self.vectorizer.transform([description.lower()])
            category = self.model.predict(X)[0]
            
            text = description.lower()
            if any(word in text for word in ['smoke', 'fire', 'burning']):
                severity = 'CRITICAL'
            elif any(word in text for word in ['hot', 'broken', 'dead']):
                severity = 'HIGH'
            elif any(word in text for word in ['slow', 'freeze', 'error']):
                severity = 'MEDIUM'
            else:
                severity = 'LOW'
            
            return category, severity
        except:
            return 'General', 'MEDIUM'
        
# GLOBAL INSTANCE
classifier = Classifier()

# AI CLASSIFY FUNCTION  
def ai_classify(description):
    return classifier.classify(description)
    


# USER TICKETS
def ticket_detail(request, token):
    ticket = get_object_or_404(Ticket, token=token)
    
    # Security: Only show if user owns ticket OR is staff
    if ticket.reporter != request.user and not request.user.is_staff:
        return render(request, 'ticket_detail.html', {'ticket': None})
    
    return render(request, 'ticket_detail.html', {'ticket': ticket})


# TRACKING + REPORTING (Combined)
@login_required  
def track_ticket(request):
    profile = get_profile(request.user)
    
    # REPORT NEW PROBLEM
    if request.method == 'POST' and 'description' in request.POST:
        branch = request.POST.get('branch', profile.branch or 'Main Campus')
        description = request.POST.get('description')
        
        classification, severity = ai_classify(description)
        token = generate_token()  
        
        ticket = Ticket.objects.create(
            token=token, 
            reporter=request.user, 
            branch=branch,
            description=description, 
            ai_classification=classification,
            severity=severity, 
            status='pending'
        )
        messages.success(request, f'Ticket #{token} created!')
    
    # SEARCH TICKET
    search_token = request.GET.get('token', '').upper().strip()
    ticket = None
    if search_token:
        try:
            if request.user.is_staff or profile.role == 'tech':
                ticket = Ticket.objects.get(token=search_token)
            else:
                ticket = Ticket.objects.filter(token=search_token, reporter=request.user).first()
        except Ticket.DoesNotExist:
            messages.warning(request, f'Ticket #{search_token} not found')
    
    context = {'ticket': ticket, 'profile': profile, 'search_token': search_token}
    return render(request, 'track.html', context)

# TECH DASHBOARD
@login_required
def tech_dashboard(request):
    profile = get_profile(request.user)
    
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
    profile = get_profile(request.user)
    try:
        if request.user.is_staff or profile.role == 'tech':
            ticket = Ticket.objects.get(token=token)
        else:
            ticket = Ticket.objects.get(token=token, reporter=request.user)
    except Ticket.DoesNotExist:
        ticket = None
        messages.error(request, 'Ticket not found')
    return render(request, 'ticket_detail.html', {'ticket': ticket, 'profile': profile})


@login_required
def assign_ticket(request, token):
    profile = get_profile(request.user)
    if profile.role != 'tech':
        return redirect('dashboard')
    ticket = get_object_or_404(Ticket, token=token)
    ticket.status = 'in_progress'
    ticket.assigned_to = request.user
    ticket.save()
    messages.success(request, f'Ticket #{token} assigned to you!')
    return redirect('tech_dashboard')

@login_required
def resolve_ticket(request, token):
    profile = get_profile(request.user)
    if profile.role != 'tech':
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
    ticket = get_object_or_404(Ticket, token=token, reporter=request.user)
    if ticket.status == 'solved':
        ticket.status = 'pending'
        ticket.solved_by = None
        ticket.solved_at = None
        ticket.save()
        messages.success(request, f'Ticket #{token} reopened!')
    return redirect('track')
