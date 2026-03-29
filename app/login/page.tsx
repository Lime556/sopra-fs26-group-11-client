"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import styles from "@/styles/login.module.css";

interface FormFieldProps {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();

  const { set: setToken } = useLocalStorage<string>("token", "");

  const handleLogin = async (values: FormFieldProps) => {
    try {
      const response = await apiService.post<User>("/login", values);

      if (response.token) setToken(response.token);
      router.replace("/users");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the login:\n${error.message}`);
      } else {
        console.error("Unknown error during login");
      }
    }
  };

  return (
    <div className={styles["login-container"]}>
      <div className={styles.card}>
        <h1>Settlers of Catan</h1>
        <p>Welcome back!</p>

        <Form
          form={form}
          name="login"
          layout="vertical"
          onFinish={handleLogin}
        >
          {/* Username */}
          <Form.Item
            label="Username"
            name="username"
            className={styles["form-item"]}
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <div className={styles["input-wrapper"]}>
              <UserOutlined className={styles["input-icon"]} />
              <Input placeholder="Enter your username" />
            </div>
          </Form.Item>

          {/* Password */}
          <Form.Item
            label="Password"
            name="password"
            className={styles["form-item"]}
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <div className={styles["input-wrapper"]}>
              <LockOutlined className={styles["input-icon"]} />
              <Input.Password placeholder="Enter your password" />
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              htmlType="submit"
              className={styles["login-button"]}
            >
              Login
            </Button>
          </Form.Item>
        </Form>
        
        {/* Sign Up Text */}
        <p className={styles["sign-up-text"]}>
          Don&apos;t have an account yet?{" "}
          <span
            className={styles["sign-up-link"]}
            onClick={() => router.push("/register")}
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;