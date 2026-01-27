from django.shortcuts import render, redirect
from django.http import HttpResponse

def index(request):
    return render(request, 'project/index.html')

def counter(request):
    text = request.POST.get('text', request.GET.get('text', ''))#Geting a text
    amount_of_words = len(text.split())
    return render(request,'project/counter.html',{'amount':amount_of_words})