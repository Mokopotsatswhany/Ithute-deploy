from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('staff', 'Staff'),
        ('tech', 'Technician'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=100)
    branch = models.CharField(max_length=100)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='staff')
    public_key_pem = models.TextField(blank=True, null=True)  # Store public key
    signature_method = models.CharField(max_length=20, default='rsa')
    
    def __str__(self):
        return f"{self.full_name} - {self.branch}"


class Ticket(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('solved', 'Solved'),
    ]
    
    token = models.CharField(max_length=8, unique=True)
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets')
    branch = models.CharField(max_length=100)
    description = models.TextField()
    ai_classification = models.CharField(max_length=50)
    severity = models.CharField(max_length=10)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    tech_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    solved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='solved_tickets')
    solved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"#{self.token} - {self.status}"
