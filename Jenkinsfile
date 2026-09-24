pipeline {
    agent any
    triggers {
        pollSCM('H/5 * * * *')
    }
    tools {
        jdk 'JDK-21'
        maven 'Maven-3.9'
    }
    environment {
        KUBECONFIG = '/var/jenkins_home/.kube/config'
    }
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/DahmaniInes/TalentHub.git'
            }
        }
        stage('Build') {
            steps {
                dir('backend/application-service') {
                    sh 'mvn clean compile'
                }
            }
        }
        stage('Test') {
            steps {
                dir('backend/application-service') {
                    sh 'mvn test'
                }
            }
        }
        stage('Coverage Report') {
            steps {
                dir('backend/application-service') {
                    jacoco()
                }
            }
        }
        stage('SonarQube Analysis') {
            steps {
                dir('backend/application-service') {
                    withSonarQubeEnv('SonarQube') {
                        sh 'mvn sonar:sonar'
                    }
                }
            }
        }
        stage('Quality Gate') {
            steps {
                timeout(time: 2, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        stage('Package') {
            steps {
                dir('backend/application-service') {
                    sh 'mvn package -DskipTests'
                }
            }
        }
        stage('Docker Build & Push') {
            steps {
                dir('backend/application-service') {
                    sh '''
                        docker build -t talenthubines2026.azurecr.io/application-service:latest .
                        docker push talenthubines2026.azurecr.io/application-service:latest
                    '''
                }
            }
        }
        stage('Clean Docker Images') {
            steps {
                sh 'docker image prune -f'
            }
        }
        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    kubectl rollout restart deployment application-service -n talenthub
                    kubectl rollout status deployment application-service -n talenthub --timeout=120s
                '''
            }
        }
    }
    post {
        always {
            junit allowEmptyResults: true, testResults: 'backend/application-service/target/surefire-reports/*.xml'
        }
        success {
            echo '✅ Pipeline terminé avec succès — build, tests, analyse qualité, et déploiement validés.'
            mail to: 'inesdahmani230@gmail.com',
                 subject: "✅ Pipeline RÉUSSI — Build #${env.BUILD_NUMBER}",
                 body: "Le pipeline TalentHub s'est terminé avec succès.

Build : #${env.BUILD_NUMBER}
Branche : main
Voir les détails : ${env.BUILD_URL}"
        }
        failure {
            echo '❌ Le pipeline a échoué — vérifier les logs.'
            mail to: 'inesdahmani230@gmail.com',
                 subject: "❌ Pipeline ÉCHOUÉ — Build #${env.BUILD_NUMBER}",
                 body: "Le pipeline TalentHub a échoué.

Build : #${env.BUILD_NUMBER}
Voir les logs : ${env.BUILD_URL}console"
        }
    }
}