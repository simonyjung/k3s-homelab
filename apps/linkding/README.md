# Linkding

https://linkding.link/installation/

# User Setup

The linkding Docker image does not provide an initial user, so you have to create one after setting up an installation. To do so, replace the credentials in the following command and run it:

```
kubectl exec -it -n <linkding_namespace> <linkding_pod_name> -- python manage.py createsuperuser --username=joe --email=joe@example.com
```