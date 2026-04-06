<?php 
session_start(); 
 
if (!isset($_SESSION['user'])) { 
     echo "not_logged_in"; 
} 
?> 
