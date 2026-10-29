package com.example.taskmanagerpro.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration(proxyBeanMethods = false)
public class ProductionStartupValidationConfiguration {
    @Bean
    static BeanFactoryPostProcessor validateStartupConfiguration(Environment environment) {
        return beanFactory -> ProductionStartupValidator.validate(environment);
    }
}
