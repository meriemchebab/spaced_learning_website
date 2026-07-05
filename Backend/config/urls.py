"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from card.views import RetrieveCards,ReadUpdateDeleteCard , process_flashcard_review
from rest_framework_simplejwt.views import TokenObtainPairView , TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    # path('api/card/<int:card_id>/', views.fetsh_card_by_id, name="get-a-card-by-id"),
    # path('api/topics/<int:topic_id>/cards', views.fetsh_card_by_topic, name="get-cards-by-topic"),
    # path('api/cards/date/<str:due>/', views.fetsh_card_by_date, name="get-cards-by-date"),
    # path('api/cards/type/<str:type>/', views.fetsh_card_by_type, name="get-cards-by-type"),
    path('api/cards/',RetrieveCards.as_view(),name="return a list of cards based on a filter"),
    path('api/cards/<int:card_id>',ReadUpdateDeleteCard.as_view(),name="delete update or just read a card"),
    path('api/cards/<int:card_id>/ratings/<int:user_rating>/<int:duration_ms>/',
         process_flashcard_review,name="update the card from review "),
    path('api/token',TokenObtainPairView.as_view(),name="access token view"),
    path('api/token/refresh',TokenRefreshView.as_view(),name="refresh token view"),
]

